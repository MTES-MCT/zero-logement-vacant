import { Request, Response } from 'express';
import { body, ValidationChain } from 'express-validator';
import ownerRepository from '../repositories/ownerRepository';
import { DraftOwnerApi, HousingOwnerApi, OwnerApi } from '../models/OwnerApi';
import eventRepository from '../repositories/eventRepository';
import { AuthenticatedRequest, Request as JWTRequest } from 'express-jwt';
import { constants } from 'http2';
import { AddressKinds } from '../models/AddressApi';
import OwnerMissingError from '../errors/ownerMissingError';
import banAddressesRepository from '../repositories/banAddressesRepository';
import { v4 as uuidv4 } from 'uuid';
import { isArrayOf, isString } from '../utils/validators';
import { parse } from 'date-fns';
import { compare } from '../utils/compareUtils';
import { logger } from '../utils/logger';
import housingRepository from '../repositories/housingRepository';
import HousingMissingError from '../errors/housingMissingError';

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

const listByHousing = async (request: Request, response: Response) => {
  const housingId = request.params.housingId;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;

  logger.info('List owner for housing', housingId);

  const housing = await housingRepository.get(housingId, establishmentId);
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const owners = await ownerRepository.listByHousing(housing);
  response.status(constants.HTTP_STATUS_OK).json(owners);
};

type DraftOwnerBody = DraftOwnerApi & { birthDate: string };
const create = async (request: Request, response: Response) => {
  console.log('Create owner');

  const userId = (request as AuthenticatedRequest).auth.userId;
  const draftOwnerApi = <DraftOwnerBody>request.body;

  const createdOwnerApi = await ownerRepository.insert({
    ...draftOwnerApi,
    birthDate: draftOwnerApi.birthDate
      ? parse(draftOwnerApi.birthDate, 'yyyy-MM-dd', new Date())
      : undefined,
  });

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

type HousingOwnerBody = HousingOwnerApi & { birthDate: string };

const parseHousingOwnerApi = (
  housingOwnerBody: HousingOwnerBody
): HousingOwnerApi => ({
  ...housingOwnerBody,
  birthDate: housingOwnerBody.birthDate
    ? parse(housingOwnerBody.birthDate, 'yyyy-MM-dd', new Date())
    : undefined,
});

const update = async (request: JWTRequest, response: Response) => {
  const ownerId = request.params.ownerId;

  console.log('Update owner', ownerId);

  const userId = (request as AuthenticatedRequest).auth.userId;
  const ownerApi = {
    ...parseHousingOwnerApi(request.body as HousingOwnerBody),
    id: ownerId,
  };

  const updatedOwnerApi = await updateOwner(ownerApi, userId);

  return response.status(constants.HTTP_STATUS_OK).json(updatedOwnerApi);
};

const updateOwner = async (
  ownerApi: OwnerApi,
  userId: string
): Promise<OwnerApi | undefined> => {
  console.log('Update owner', ownerApi.id);

  const prevOwnerApi = await ownerRepository.get(ownerApi.id);

  if (!prevOwnerApi) {
    throw new OwnerMissingError(ownerApi.id);
  }

  const updatedOwnerApi = {
    ...prevOwnerApi,
    fullName: ownerApi.fullName,
    birthDate: ownerApi.birthDate,
    rawAddress: ownerApi.rawAddress,
    email: ownerApi.email,
    phone: ownerApi.phone,
  };

  const hasIdentityChanges =
    Object.values(
      compare(prevOwnerApi, updatedOwnerApi, ['fullName', 'birthDate'])
    ).length > 0;

  const hasContactChanges =
    Object.values(
      compare(prevOwnerApi, updatedOwnerApi, ['rawAddress', 'email', 'phone'])
    ).length > 0;

  if (hasIdentityChanges || hasContactChanges) {
    console.log('updatedOwnerApi', updatedOwnerApi);

    await ownerRepository.update(updatedOwnerApi);

    await banAddressesRepository.markAddressToBeNormalized(
      ownerApi.id,
      AddressKinds.Owner
    );

    if (hasIdentityChanges) {
      await eventRepository.insertOwnerEvent({
        id: uuidv4(),
        name: "Modification d'identité",
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire',
        old: prevOwnerApi,
        new: updatedOwnerApi,
        createdBy: userId,
        createdAt: new Date(),
        ownerId: ownerApi.id,
      });
    }

    if (hasContactChanges) {
      await eventRepository.insertOwnerEvent({
        id: uuidv4(),
        name: 'Modification de coordonnées',
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire',
        old: prevOwnerApi,
        new: updatedOwnerApi,
        createdBy: userId,
        createdAt: new Date(),
        ownerId: ownerApi.id,
      });
    }

    return updatedOwnerApi;
  }
};

const updateHousingOwners = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const housingId = request.params.housingId;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  console.log('Update housing owners', housingId);

  const housing = await housingRepository.get(housingId, establishmentId);
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const userId = (request as AuthenticatedRequest).auth.userId;
  const housingOwnersApi = (<HousingOwnerBody[]>request.body)
    .map((_) => parseHousingOwnerApi(_))
    .filter((_) => _.housingId === housingId);

  await Promise.all(
    housingOwnersApi.map((housingOwnerApi) =>
      updateOwner(housingOwnerApi, userId)
    )
  );

  const prevHousingOwnersApi = await ownerRepository.listByHousing(housing);

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

    await ownerRepository.insertHousingOwners(
      housingOwnersApi.map((housingOwnerApi) => ({
        ...housingOwnerApi,
        housingGeoCode: housing.geoCode,
      }))
    );

    const newHousingOwnersApi = await ownerRepository.listByHousing(housing);

    await eventRepository.insertHousingEvent({
      id: uuidv4(),
      name: 'Changement de propriétaires',
      kind: 'Update',
      category: 'Ownership',
      section: 'Propriétaire',
      old: prevHousingOwnersApi,
      new: newHousingOwnersApi,
      createdBy: userId,
      createdAt: new Date(),
      housingId,
      housingGeoCode: newHousingOwnersApi[0].housingGeoCode,
    });

    return response.sendStatus(constants.HTTP_STATUS_OK);
  } else {
    return response.sendStatus(constants.HTTP_STATUS_NOT_MODIFIED);
  }
};

const ownerValidators: ValidationChain[] = [
  body('fullName').isString(),
  body('birthDate').isString().optional(),
  body('rawAddress').custom(isArrayOf(isString)).optional({ nullable: true }),
  body('email').optional({ checkFalsy: true }).isEmail(),
  body('phone').isString().optional({ nullable: true }),
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
