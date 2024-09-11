import { parse } from 'date-fns';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import { AddressKinds, OwnerPayloadDTO } from '@zerologementvacant/shared';
import ownerRepository from '~/repositories/ownerRepository';
import {
  fromOwnerPayloadDTO,
  hasContactChanges,
  hasIdentityChanges,
  OwnerApi
} from '~/models/OwnerApi';
import eventRepository from '~/repositories/eventRepository';
import OwnerMissingError from '~/errors/ownerMissingError';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import { isArrayOf, isString } from '~/utils/validators';
import { logger } from '~/infra/logger';
import housingRepository from '~/repositories/housingRepository';
import HousingMissingError from '~/errors/housingMissingError';
import { HousingOwnerApi, toHousingOwnerDTO } from '~/models/HousingOwnerApi';
import { isDefined, isNotNull } from '@zerologementvacant/utils';
import {
  HousingOwnerDTO,
  HousingOwnerPayloadDTO,
  OwnerDTO
} from '@zerologementvacant/models';
import async from 'async';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';

interface PathParams extends Record<string, string> {
  id: string;
}

async function get(request: Request, response: Response) {
  const { id } = request.params;
  logger.info('Get owner', id);

  const owner = await ownerRepository.get(id);
  if (!owner) {
    throw new OwnerMissingError(id);
  }

  response.status(constants.HTTP_STATUS_OK).json(owner);
}

async function search(request: Request, response: Response) {
  const q = request.body.q;
  const page = request.body.page;
  const perPage = request.body.perPage;

  logger.info('Search owner', q);

  const owners = await ownerRepository.searchOwners(q, page, perPage);
  response.status(constants.HTTP_STATUS_OK).json(owners);
}

async function listByHousing(request: Request, response: Response) {
  const housingId = request.params.housingId;
  const establishment = (request as AuthenticatedRequest).establishment;

  logger.info('List owner for housing', housingId);

  const housing = await housingRepository.findOne({
    id: housingId,
    geoCode: establishment.geoCodes
  });
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const owners = await ownerRepository.findByHousing(housing);
  response.status(constants.HTTP_STATUS_OK).json(owners);
}

async function create(request: Request, response: Response) {
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
    email: body.email
  };

  await ownerRepository.betterSave(owner);
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
    ownerId: owner.id
  });

  response.status(constants.HTTP_STATUS_OK).json(owner);
}

async function update(
  request: Request<PathParams, OwnerDTO, OwnerPayloadDTO, never>,
  response: Response<OwnerDTO>
) {
  const { auth, body, params } = request as AuthenticatedRequest<
    PathParams,
    OwnerDTO,
    OwnerPayloadDTO,
    never
  >;

  const owner: OwnerApi = {
    ...fromOwnerPayloadDTO(body),
    id: params.id
  };

  const updatedOwnerApi = await updateOwner(owner, auth.userId);
  response.status(constants.HTTP_STATUS_OK).json(updatedOwnerApi);
}

async function updateOwner(
  ownerApi: OwnerApi,
  userId: string
): Promise<OwnerApi | undefined> {
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
    additionalAddress: ownerApi.additionalAddress
  };

  if (
    hasIdentityChanges(prevOwnerApi, updatedOwnerApi) ||
    hasContactChanges(prevOwnerApi, updatedOwnerApi) ||
    updatedOwnerApi.banAddress !== prevOwnerApi.banAddress
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
          address: [
            updatedOwnerApi.banAddress.houseNumber,
            updatedOwnerApi.banAddress.street,
            updatedOwnerApi.banAddress.postalCode,
            updatedOwnerApi.banAddress.city
          ]
            .filter(isDefined)
            .filter(isNotNull)
            .join(''),
          addressKind: AddressKinds.Owner,
          ...updatedOwnerApi.banAddress
        }
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
        ownerId: ownerApi.id
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
        ownerId: ownerApi.id
      });
    }

    return updatedOwnerApi;
  }
}

async function updateHousingOwners(
  request: Request<
    PathParams,
    HousingOwnerDTO[],
    HousingOwnerPayloadDTO[],
    never
  >,
  response: Response<HousingOwnerDTO[]>
) {
  const { auth, body, params, establishment } = request as AuthenticatedRequest<
    PathParams,
    HousingOwnerDTO[],
    HousingOwnerPayloadDTO[],
    never
  >;

  logger.debug('Updating housing owners...', { housing: params.housingId });

  const housing = await housingRepository.findOne({
    id: params.housingId,
    geoCode: establishment.geoCodes
  });
  if (!housing) {
    throw new HousingMissingError(params.housingId);
  }

  const existingHousingOwners = await ownerRepository.findByHousing(housing);

  if (
    existingHousingOwners.length === body.length &&
    existingHousingOwners.every((existingHousingOwner) => {
      const found = body.find((ho) => ho.id === existingHousingOwner.id);
      return found && found.rank === existingHousingOwner.rank;
    })
  ) {
    return response.status(constants.HTTP_STATUS_NOT_MODIFIED).send();
  }

  const housingOwners: HousingOwnerApi[] = await async.map(
    body,
    async (
      housingOwnerPayload: HousingOwnerPayloadDTO
    ): Promise<HousingOwnerApi> => {
      const owner = await ownerRepository.get(housingOwnerPayload.id);
      if (!owner) {
        throw new OwnerMissingError(housingOwnerPayload.id);
      }
      return {
        ...owner,
        ownerId: owner.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id,
        rank: housingOwnerPayload.rank,
        idprocpte: housingOwnerPayload.idprocpte ?? undefined,
        idprodroit: housingOwnerPayload.idprodroit ?? undefined,
        locprop: housingOwnerPayload.locprop ?? undefined
      };
    }
  );

  await housingOwnerRepository.saveMany(housingOwners);
  await eventRepository.insertHousingEvent({
    id: uuidv4(),
    name: 'Changement de propriétaires',
    kind: 'Update',
    category: 'Ownership',
    section: 'Propriétaire',
    old: existingHousingOwners,
    new: housingOwners,
    createdBy: auth.userId,
    createdAt: new Date(),
    housingId: housing.id,
    housingGeoCode: housing.geoCode
  });

  response
    .status(constants.HTTP_STATUS_OK)
    .json(housingOwners.map(toHousingOwnerDTO));
}

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
  body('additionalAddress').isString().optional()
];

const ownerController = {
  get,
  search,
  create,
  update,
  ownerValidators,
  listByHousing,
  updateHousingOwners
};

export default ownerController;
