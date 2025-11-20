import {
  AddressKinds,
  HousingOwnerDTO,
  HousingOwnerPayloadDTO,
  OwnerCreationPayload,
  OwnerDTO,
  OwnerUpdatePayload
} from '@zerologementvacant/models';
import async from 'async';
import { Array, pipe, Record } from 'effect';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import type { ParsedQs } from 'qs';
import { match } from 'ts-pattern';
import { v4 as uuidv4 } from 'uuid';
import HousingMissingError from '~/errors/housingMissingError';
import OwnerMissingError from '~/errors/ownerMissingError';
import { startTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { HousingOwnerEventApi, OwnerEventApi } from '~/models/EventApi';
import {
  HOUSING_OWNER_EQUIVALENCE,
  HOUSING_OWNER_RANK_EQUIVALENCE,
  HousingOwnerApi,
  toHousingOwnerDTO
} from '~/models/HousingOwnerApi';
import { diffUpdatedOwner, OwnerApi, toOwnerDTO } from '~/models/OwnerApi';
import { type PaginationApi } from '~/models/PaginationApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import eventRepository from '~/repositories/eventRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import housingRepository from '~/repositories/housingRepository';
import ownerRepository from '~/repositories/ownerRepository';
import { isArrayOf, isString } from '~/utils/validators';

type ListOwnersQuery = ParsedQs & PaginationApi & {
  search?: string;
};

const list: RequestHandler<
  never,
  ReadonlyArray<OwnerDTO>,
  never,
  ListOwnersQuery
> = async (request, response): Promise<void> => {
  const { query } = request;
  logger.info('List owners', query);

  const pagination = match(query)
    .returnType<PaginationApi>()
    .with({ paginate: undefined }, (query) => ({
      paginate: true,
      page: query.page,
      perPage: query.perPage
    }))
    .otherwise((query) => query);

  const [count, owners] = await Promise.all([
    ownerRepository.count({
      filters: {
        idpersonne: true
      },
      search: query.search,
      includes: ['banAddress'],
      pagination: pagination
    }),
    ownerRepository.find({
      filters: {
        idpersonne: true
      },
      search: query.search,
      includes: ['banAddress'],
      pagination: pagination
    })
  ]);

  const rangeStart = pagination.paginate
    ? (pagination.page - 1) * pagination.perPage
    : 0;
  const rangeEnd = pagination.paginate
    ? Math.min(rangeStart + pagination.perPage - 1, count - 1)
    : Math.max(count - 1, 0);

  response
    .set('Accept-Ranges', 'owners')
    .set('Content-Range', `owners ${rangeStart}-${rangeEnd}/${count}`)
    .status(constants.HTTP_STATUS_PARTIAL_CONTENT)
    .json(owners.map(toOwnerDTO));
};

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

/**
 * @deprecated Use {@link find} instead
 * @param request
 * @param response
 */
async function search(request: Request, response: Response) {
  const q = request.body.q;
  const page = request.body.page;
  const perPage = request.body.perPage;

  logger.info('Search owner', q);

  const owners = await ownerRepository.searchOwners(q, page, perPage);
  response.status(constants.HTTP_STATUS_OK).json(owners);
}

const listByHousing: RequestHandler<
  PathParams,
  ReadonlyArray<HousingOwnerDTO>
> = async (request, response): Promise<void> => {
  const { establishment, params } = request as AuthenticatedRequest<
    PathParams,
    ReadonlyArray<HousingOwnerDTO>
  >;

  logger.info('List owner for housing', { id: params.id });

  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    id: params.id,
    geoCode: establishment.geoCodes
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  const housingOwners = await ownerRepository.findByHousing(housing);
  response
    .status(constants.HTTP_STATUS_OK)
    .json(housingOwners.map(toHousingOwnerDTO));
};

const create: RequestHandler<
  never,
  OwnerDTO,
  OwnerCreationPayload,
  never
> = async (request, response): Promise<void> => {
  logger.info('Creating owner...', request.body);

  const { auth, body } = request as AuthenticatedRequest<
    never,
    OwnerDTO,
    OwnerCreationPayload,
    never
  >;
  const owner: OwnerApi = {
    id: uuidv4(),
    // Should be filled by the user...
    idpersonne: null,
    fullName: body.fullName,
    rawAddress: body.rawAddress,
    banAddress: null,
    additionalAddress: null,
    birthDate: body.birthDate
      ? new Date(body.birthDate).toJSON().substring(0, 'yyyy-mm-dd'.length)
      : null,
    administrator: null,
    // TODO: we should ask the user to provide the kind of owner
    kind: null,
    phone: body.phone,
    email: body.email,
    // TODO: obtain this from the frontend form
    entity: 'personnes-physiques',
    siren: null,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON()
  };

  await ownerRepository.betterSave(owner, {
    onConflict: ['id'],
    merge: false
  });
  await eventRepository.insertManyOwnerEvents([
    {
      id: uuidv4(),
      name: "Création d'un nouveau propriétaire",
      type: 'owner:created',
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      nextOld: null,
      nextNew: {
        name: owner.fullName,
        birthdate: owner.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null,
        email: owner.email,
        phone: owner.phone,
        address: owner.rawAddress?.length ? owner.rawAddress.join(' ') : null,
        additionalAddress: null
      },
      ownerId: owner.id
    }
  ]);

  response.status(constants.HTTP_STATUS_OK).json(toOwnerDTO(owner));
};

async function update(
  request: Request<PathParams, OwnerDTO, OwnerUpdatePayload, never>,
  response: Response<OwnerDTO>
) {
  const { auth, body, params } = request as AuthenticatedRequest<
    PathParams,
    OwnerDTO,
    OwnerUpdatePayload,
    never
  >;

  const existingOwner = await ownerRepository.get(params.id);
  if (!existingOwner) {
    throw new OwnerMissingError(params.id);
  }

  const banAddress: AddressApi | null = body.banAddress
    ? {
        ...body.banAddress,
        refId: existingOwner.id,
        addressKind: AddressKinds.Owner,
        lastUpdatedAt: new Date().toJSON()
      }
    : null;
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
    idpersonne: existingOwner.idpersonne,
    siren: existingOwner.siren,
    dataSource: existingOwner.dataSource,
    entity: existingOwner.entity,
    createdAt: existingOwner.createdAt,
    updatedAt: new Date().toJSON()
  };

  const { before, after, changed } = diffUpdatedOwner(
    {
      name: existingOwner.fullName,
      birthdate:
        existingOwner.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null,
      email: existingOwner.email,
      phone: existingOwner.phone,
      address: existingOwner.banAddress?.label ?? null,
      additionalAddress: existingOwner.additionalAddress
    },
    {
      name: owner.fullName,
      birthdate: owner.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null,
      email: owner.email,
      phone: owner.phone,
      address: owner.banAddress?.label ?? null,
      additionalAddress: owner.additionalAddress
    }
  );
  const events: OwnerEventApi[] = [];
  if (changed.length > 0) {
    events.push({
      id: uuidv4(),
      name: 'Propriétaire mis à jour',
      type: 'owner:updated',
      nextOld: {
        ...before,
        name: existingOwner.fullName
      },
      nextNew: {
        ...after,
        name: owner.fullName
      },
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      ownerId: owner.id
    });
  }

  await Promise.all([
    ownerRepository.betterSave(owner, {
      onConflict: ['id'],
      merge: [
        'full_name',
        'birth_date',
        'email',
        'phone',
        'additional_address',
        'updated_at'
      ]
    }),
    banAddress
      ? banAddressesRepository.save(banAddress)
      : banAddressesRepository.remove(existingOwner.id, AddressKinds.Owner),
    eventRepository.insertManyOwnerEvents(events)
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
    establishment: establishment.id,
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
        idprocpte: housingOwnerPayload.idprocpte,
        idprodroit: housingOwnerPayload.idprodroit,
        locprop: housingOwnerPayload.locprop,
        relativeLocation: null,
        absoluteDistance: null,
        propertyRight: housingOwnerPayload.propertyRight,
        startDate: new Date(),
        endDate: null,
        origin: null
      };
    }
  );

  const substract = Array.differenceWith(HOUSING_OWNER_EQUIVALENCE);
  const added = substract(housingOwners, existingHousingOwners);
  const removed = substract(existingHousingOwners, housingOwners);
  const updated = pipe(
    Array.intersectionWith(HOUSING_OWNER_EQUIVALENCE)(
      existingHousingOwners,
      housingOwners
    ),
    Array.filter((existingHousingOwner) => {
      return !Array.containsWith(HOUSING_OWNER_RANK_EQUIVALENCE)(
        housingOwners,
        existingHousingOwner
      );
    })
  );

  const events: ReadonlyArray<HousingOwnerEventApi> = [
    ...added.map<HousingOwnerEventApi>((housingOwner) => ({
      id: uuidv4(),
      type: 'housing:owner-attached',
      name: 'Propriétaire ajouté au logement',
      nextOld: null,
      nextNew: {
        name: housingOwner.fullName,
        rank: housingOwner.rank
      },
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      ownerId: housingOwner.ownerId,
      housingGeoCode: housingOwner.housingGeoCode,
      housingId: housingOwner.housingId
    })),
    ...removed.map<HousingOwnerEventApi>((housingOwner) => ({
      id: uuidv4(),
      type: 'housing:owner-detached',
      name: 'Propriétaire retiré du logement',
      nextOld: {
        name: housingOwner.fullName,
        rank: housingOwner.rank
      },
      nextNew: null,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      ownerId: housingOwner.ownerId,
      housingGeoCode: housingOwner.housingGeoCode,
      housingId: housingOwner.housingId
    })),
    ...updated.map<HousingOwnerEventApi>((housingOwner) => {
      const newHousingOwner = housingOwners.find((ho) =>
        HOUSING_OWNER_EQUIVALENCE(ho, housingOwner)
      ) as HousingOwnerApi;
      return {
        id: uuidv4(),
        type: 'housing:owner-updated',
        name: 'Propriétaire mis à jour',
        nextOld: {
          name: housingOwner.fullName,
          rank: housingOwner.rank
        },
        nextNew: {
          name: newHousingOwner.fullName,
          rank: newHousingOwner.rank
        },
        createdAt: new Date().toJSON(),
        createdBy: auth.userId,
        ownerId: housingOwner.ownerId,
        housingGeoCode: housingOwner.housingGeoCode,
        housingId: housingOwner.housingId
      };
    })
  ];

  await startTransaction(async () => {
    await housingOwnerRepository.saveMany(housingOwners);
    await eventRepository.insertManyHousingOwnerEvents(events);
  });
  response
    .status(constants.HTTP_STATUS_OK)
    .json(housingOwners.map(toHousingOwnerDTO));
}

const ownerValidators: ValidationChain[] = [
  body('fullName').isString(),
  body('birthDate').isString().isISO8601().optional({ nullable: true }),
  body('rawAddress').custom(isArrayOf(isString)).optional({ nullable: true }),
  body('email').optional({ checkFalsy: true }).isEmail(),
  body('phone').isString().optional({ nullable: true }),
  body('banAddress.banId').isString().optional(),
  body('banAddress.label').isString().optional(),
  body('banAddress.houseNumber').isString().optional({ nullable: true }),
  body('banAddress.street').isString().optional({ nullable: true }),
  body('banAddress.postalCode').isString().optional({ nullable: true }),
  body('banAddress.city').isString().optional({ nullable: true }),
  body('banAddress.latitude').isNumeric().optional({ nullable: true }),
  body('banAddress.longitude').isNumeric().optional({ nullable: true }),
  body('banAddress.score').isNumeric().optional({ nullable: true }),
  body('additionalAddress').isString().optional({ nullable: true })
];

const ownerController = {
  list,
  get,
  search,
  create,
  update,
  ownerValidators,
  listByHousing,
  updateHousingOwners
};

export default ownerController;
