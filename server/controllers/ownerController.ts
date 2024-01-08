import { Request, Response } from 'express';
import { body, ValidationChain } from 'express-validator';
import ownerRepository from '../repositories/ownerRepository';
import {
  fromOwnerPayloadDTO,
  hasContactChanges,
  hasIdentityChanges,
  OwnerApi,
} from '../models/OwnerApi';
import eventRepository from '../repositories/eventRepository';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import OwnerMissingError from '../errors/ownerMissingError';
import banAddressesRepository from '../repositories/banAddressesRepository';
import { v4 as uuidv4 } from 'uuid';
import { isArrayOf, isString } from '../utils/validators';
import { parse } from 'date-fns';
import { logger } from '../utils/logger';
import housingRepository from '../repositories/housingRepository';
import HousingMissingError from '../errors/housingMissingError';
import { OwnerPayloadDTO } from '../../shared';
import { HousingOwnerApi } from '../models/HousingOwnerApi';
import { AddressKinds } from '../../shared/models/AdresseDTO';

const get = async (request: Request, response: Response) => {
  const { id } = request.params;
  logger.info('Get owner', id);

  const owner = await ownerRepository.get(id);
  if (!owner) {
    throw new OwnerMissingError(id);
  }

  response.status(constants.HTTP_STATUS_OK).json(owner);
};

const search = async (request: Request, response: Response) => {
  const q = request.body.q;
  const page = request.body.page;
  const perPage = request.body.perPage;

  logger.info('Search owner', q);

  const owners = await ownerRepository.searchOwners(q, page, perPage);
  response.status(constants.HTTP_STATUS_OK).json(owners);
};

const listByHousing = async (request: Request, response: Response) => {
  const housingId = request.params.housingId;
  const establishment = (request as AuthenticatedRequest).establishment;

  logger.info('List owner for housing', housingId);

  const housing = await housingRepository.findOne({
    id: housingId,
    geoCode: establishment.geoCodes,
  });
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const owners = await ownerRepository.findByHousing(housing);
  response.status(constants.HTTP_STATUS_OK).json(owners);
};

const create = async (request: Request, response: Response) => {
  logger.info('Create owner', request.body);

  const { auth } = request as AuthenticatedRequest;
  const body = request.body as OwnerPayloadDTO;
  const owner: OwnerApi = {
    id: uuidv4(),
    fullName: body.fullName,
    rawAddress: body.rawAddress,
    birthDate: body.birthDate
      ? parse(body.birthDate, 'yyyy-MM-dd', new Date())
      : undefined,
    phone: body.phone,
    email: body.email,
  };

  await ownerRepository.save(owner);
  await banAddressesRepository.markAddressToBeNormalized(
    owner.id,
    AddressKinds.Owner
  );
  await eventRepository.insertOwnerEvent({
    id: uuidv4(),
    name: "Création d'un nouveau propriétaire",
    kind: 'Create',
    category: 'Ownership',
    section: 'Propriétaire',
    new: owner,
    createdBy: auth.userId,
    createdAt: new Date(),
    ownerId: owner.id,
  });

  response.status(constants.HTTP_STATUS_OK).json(owner);
};

type HousingOwnerBody = HousingOwnerApi & { birthDate: string };

const parseHousingOwnerApi = (
  housingOwnerBody: HousingOwnerBody
): HousingOwnerApi => ({
  ...housingOwnerBody,
  birthDate: housingOwnerBody.birthDate
    ? new Date(housingOwnerBody.birthDate)
    : undefined,
});

const update = async (request: Request, response: Response) => {
  const { auth, params } = request as AuthenticatedRequest;

  const owner: OwnerApi = {
    ...fromOwnerPayloadDTO(request.body as OwnerPayloadDTO),
    id: params.id,
  };

  const updatedOwnerApi = await updateOwner(owner, auth.userId);
  response.status(constants.HTTP_STATUS_OK).json(updatedOwnerApi);
};

const updateOwner = async (
  ownerApi: OwnerApi,
  userId: string
): Promise<OwnerApi | undefined> => {
  logger.info('Update owner', ownerApi.id);

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
    banAddress: ownerApi.banAddress,
    additionalAddress: ownerApi.additionalAddress,
  };

  if (
    hasIdentityChanges(prevOwnerApi, updatedOwnerApi) ||
    hasContactChanges(prevOwnerApi, updatedOwnerApi)
  ) {
    logger.debug('updatedOwnerApi', updatedOwnerApi);

    await ownerRepository.update(updatedOwnerApi);

    if (
      updatedOwnerApi.banAddress &&
      updatedOwnerApi.banAddress !== prevOwnerApi.banAddress
    ) {
      await banAddressesRepository.upsertList([
        {
          refId: ownerApi.id,
          addressKind: AddressKinds.Owner,
          ...updatedOwnerApi.banAddress,
        },
      ]);
    }

    if (hasIdentityChanges(prevOwnerApi, updatedOwnerApi)) {
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

    if (hasContactChanges(prevOwnerApi, updatedOwnerApi)) {
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

const updateHousingOwners = async (request: Request, response: Response) => {
  const { auth, params, establishment } = request as AuthenticatedRequest;
  const housingId = params.housingId;

  logger.debug('Update housing owners', { housing: housingId });

  const housing = await housingRepository.findOne({
    id: housingId,
    geoCode: establishment.geoCodes,
  });
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const housingOwnersApi = (<HousingOwnerBody[]>request.body)
    .map(parseHousingOwnerApi)
    .filter((_) => _.housingId === housingId);

  await Promise.all(
    housingOwnersApi.map((housingOwnerApi) =>
      updateOwner(housingOwnerApi, auth.userId)
    )
  );

  const prevHousingOwnersApi = await ownerRepository.findByHousing(housing);

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

    const newHousingOwnersApi = await ownerRepository.findByHousing(housing);

    await eventRepository.insertHousingEvent({
      id: uuidv4(),
      name: 'Changement de propriétaires',
      kind: 'Update',
      category: 'Ownership',
      section: 'Propriétaire',
      old: prevHousingOwnersApi,
      new: newHousingOwnersApi,
      createdBy: auth.userId,
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
  body('birthDate').isString().isISO8601().optional(),
  body('rawAddress').custom(isArrayOf(isString)).optional({ nullable: true }),
  body('email').optional({ checkFalsy: true }).isEmail(),
  body('phone').isString().optional({ nullable: true }),
  body('banAddress.houseNumber').isString().optional(),
  body('banAddress.street').isString().optional(),
  body('banAddress.postalCode').isString().optional(),
  body('banAddress.city').isString().optional(),
  body('banAddress.latitude').isNumeric().optional(),
  body('banAddress.longitude').isNumeric().optional(),
  body('banAddress.score').isNumeric().optional(),
  body('additionalAddress').isString().optional(),
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
