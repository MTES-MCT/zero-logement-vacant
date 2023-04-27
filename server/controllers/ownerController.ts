import { Request, Response } from 'express';
import { body, oneOf, validationResult } from 'express-validator';
import ownerRepository from '../repositories/ownerRepository';
import { DraftOwnerApi, HousingOwnerApi, OwnerApi } from '../models/OwnerApi';
import eventRepository from '../repositories/eventRepository';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import { AddressKinds } from '../models/AddressApi';
import OwnerMissingError from '../errors/ownerMissingError';
import banAddressesRepository from '../repositories/banAddressesRepository';
import { v4 as uuidv4 } from 'uuid';

const get = async (request: Request, response: Response) => {
  const { id } = request.params;
  console.log('Get owner', id);
  const owner = await ownerRepository.get(id);
  if (!owner) {
    throw new OwnerMissingError(id);
  }

  response.status(constants.HTTP_STATUS_OK).json(owner);
};

const search = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const q = request.body.q;
  const page = request.body.page;
  const perPage = request.body.perPage;

  console.log('Search owner', q);

  return ownerRepository
    .searchOwners(q, page, perPage)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const listByHousing = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const housingId = request.params.housingId;

  console.log('List owner for housing', housingId);

  return ownerRepository
    .listByHousing(housingId)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const create = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  console.log('Create owner');

  const userId = (request as AuthenticatedRequest).auth.userId;
  const draftOwnerApi = <DraftOwnerApi>request.body.draftOwner;

  const createdOwnerApi = await ownerRepository.insert(draftOwnerApi);

  await banAddressesRepository.markAddressToBeNormalized(
    createdOwnerApi.id,
    AddressKinds.Owner
  );

  await eventRepository.insertOwnerEvent({
    id: uuidv4(),
    name: "Création d'un nouveau propriétaire",
    kind: 'Create',
    category: 'Ownership',
    section: 'Propriétaire',
    new: createdOwnerApi,
    createdBy: userId,
    createdAt: new Date(),
    ownerId: createdOwnerApi.id,
  });

  return response.status(constants.HTTP_STATUS_OK).json(createdOwnerApi);
};

const update = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  const ownerId = request.params.ownerId;

  console.log('Update owner', ownerId);

  const userId = (request as AuthenticatedRequest).auth.userId;
  const ownerApi = <OwnerApi>request.body.owner;

  const updatedOwnerApi = await ownerRepository.update(ownerApi);

  await banAddressesRepository.markAddressToBeNormalized(
    updatedOwnerApi.id,
    AddressKinds.Owner
  );

  await eventRepository.insertOwnerEvent({
    id: uuidv4(),
    name: 'Modification de coordonnées',
    kind: 'Update',
    category: 'Ownership',
    section: 'Coordonnées propriétaire',
    old: ownerApi,
    new: updatedOwnerApi,
    createdBy: userId,
    createdAt: new Date(),
    ownerId: ownerApi.id,
  });

  return response.status(constants.HTTP_STATUS_OK).json(updatedOwnerApi);
};

const updateHousingOwners = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  const housingId = request.params.housingId;

  console.log('Update housing owners', housingId);

  const userId = (request as AuthenticatedRequest).auth.userId;
  const housingOwnersApi = (<HousingOwnerApi[]>(
    request.body.housingOwners
  )).filter((_) => _.housingId === housingId);

  const prevHousingOwnersApi = await ownerRepository.listByHousing(housingId);

  if (
    prevHousingOwnersApi.length !== housingOwnersApi.length ||
    prevHousingOwnersApi.some(
      (ho1) =>
        !housingOwnersApi.some(
          (ho2) => ho1.id === ho2.id && ho1.rank === ho2.rank
        )
    )
  ) {
    await ownerRepository.deleteHousingOwners(
      housingId,
      housingOwnersApi.map((_) => _.id)
    );

    await ownerRepository.insertHousingOwners(housingOwnersApi);

    await eventRepository.insertHousingEvent({
      id: uuidv4(),
      name: 'Changement de propriétaires',
      kind: 'Update',
      category: 'Ownership',
      section: 'Propriétaire',
      old: prevHousingOwnersApi,
      new: housingOwnersApi,
      createdBy: userId,
      createdAt: new Date(),
      housingId,
    });

    return response.sendStatus(constants.HTTP_STATUS_OK);
  } else {
    return response.sendStatus(constants.HTTP_STATUS_NOT_MODIFIED);
  }
};

const ownerValidators = [
  oneOf([body('owner.email').isEmpty(), body('owner.email').isEmail()]),
];

const ownerController = {
  get,
  search,
  create,
  update,
  ownerValidators,
  listByHousing,
  updateHousingOwners,
};

export default ownerController;
