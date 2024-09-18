import async from 'async';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import {
  AddressKinds,
  HousingOwnerDTO,
  HousingOwnerPayloadDTO,
  OwnerDTO,
  OwnerPayloadDTO
} from '@zerologementvacant/models';
import ownerRepository from '~/repositories/ownerRepository';
import {
  hasContactChanges,
  hasIdentityChanges,
  OwnerApi,
  toOwnerDTO
} from '~/models/OwnerApi';
import eventRepository from '~/repositories/eventRepository';
import OwnerMissingError from '~/errors/ownerMissingError';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import { isArrayOf, isString } from '~/utils/validators';
import { logger } from '~/infra/logger';
import housingRepository from '~/repositories/housingRepository';
import HousingMissingError from '~/errors/housingMissingError';
import { HousingOwnerApi, toHousingOwnerDTO } from '~/models/HousingOwnerApi';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import { AddressApi } from '~/models/AddressApi';

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

  const housingOwners = await ownerRepository.findByHousing(housing);
  response
    .status(constants.HTTP_STATUS_OK)
    .json(housingOwners.map(toHousingOwnerDTO));
}

async function create(
  request: Request<never, OwnerDTO, OwnerPayloadDTO, never>,
  response: Response<OwnerDTO>
) {
  logger.info('Creating owner...', request.body);

  const { auth, body } = request as AuthenticatedRequest<
    never,
    OwnerDTO,
    OwnerPayloadDTO,
    never
  >;
  const owner: OwnerApi = {
    id: uuidv4(),
    fullName: body.fullName,
    rawAddress: body.rawAddress,
    birthDate: body.birthDate ? new Date(body.birthDate).toJSON() : undefined,
    phone: body.phone,
    email: body.email,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON()
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

  response.status(constants.HTTP_STATUS_OK).json(toOwnerDTO(owner));
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

  const existingOwner = await ownerRepository.get(params.id);
  if (!existingOwner) {
    throw new OwnerMissingError(params.id);
  }

  const banAddress: AddressApi | undefined = body.banAddress
    ? {
        ...body.banAddress,
        refId: existingOwner.id,
        addressKind: AddressKinds.Owner,
        lastUpdatedAt: new Date().toJSON()
      }
    : undefined;
  const owner: OwnerApi = {
    id: existingOwner.id,
    rawAddress: existingOwner.rawAddress,
    banAddress,
    fullName: body.fullName,
    administrator: existingOwner.administrator,
    birthDate: body.birthDate,
    email: body.email,
    phone: body.phone,
    additionalAddress: body.additionalAddress,
    kind: existingOwner.kind,
    kindDetail: existingOwner.kindDetail,
    idpersonne: existingOwner.idpersonne,
    siren: existingOwner.siren,
    dataSource: existingOwner.dataSource,
    createdAt: existingOwner.createdAt,
    updatedAt: new Date().toJSON()
  };

  await Promise.all([
    ownerRepository.betterSave(owner, {
      onConflict: ['id'],
      merge: [
        'address_dgfip',
        'full_name',
        'birth_date',
        'email',
        'phone',
        'additional_address',
        'updated_at'
      ]
    }),
    banAddress ? banAddressesRepository.save(banAddress) : Promise.resolve(),
    hasIdentityChanges(existingOwner, owner)
      ? eventRepository.insertOwnerEvent({
          id: uuidv4(),
          name: "Modification d'identité",
          kind: 'Update',
          category: 'Ownership',
          section: 'Coordonnées propriétaire',
          old: existingOwner,
          new: owner,
          createdBy: auth.userId,
          createdAt: new Date(),
          ownerId: owner.id
        })
      : Promise.resolve(),
    hasContactChanges(existingOwner, owner)
      ? eventRepository.insertOwnerEvent({
          id: uuidv4(),
          name: 'Modification de coordonnées',
          kind: 'Update',
          category: 'Ownership',
          section: 'Coordonnées propriétaire',
          old: existingOwner,
          new: owner,
          createdBy: auth.userId,
          createdAt: new Date(),
          ownerId: owner.id
        })
      : Promise.resolve()
  ]);

  response.status(constants.HTTP_STATUS_OK).json(toOwnerDTO(owner));
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
  body('banAddress.banId').isString().optional(),
  body('banAddress.label').isString().optional(),
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
