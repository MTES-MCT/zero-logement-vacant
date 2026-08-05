import { constants } from 'http2';

import {
  AddressKinds,
  DATAFONCIER_OWNER_EQUIVALENCE,
  HOUSING_STATUS_LABELS,
  HousingDTO,
  HousingFiltersDTO,
  type HousingPointField,
  HousingStatus,
  HousingUpdatePayloadDTO,
  isSingleChoicePrecisionCategory,
  OCCUPANCY_LABELS,
  Pagination,
  PRECISION_CATEGORY_EQUIVALENCE,
  PRECISION_EQUIVALENCE,
  toActiveRank,
  toPropertyRight,
  toSourceRelativeLocation,
  UserRole,
  type ActiveOwnerRank,
  type HousingBatchUpdatePayload
} from '@zerologementvacant/models';
import { compactUndefined } from '@zerologementvacant/utils';
import {
  Array,
  Either,
  HashMap,
  pipe,
  Predicate,
  Record,
  Struct
} from 'effect';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { match, Pattern } from 'ts-pattern';
import { v4 as uuidv4 } from 'uuid';

import DocumentMissingError from '~/errors/documentMissingError';
import HousingExistsError from '~/errors/housingExistsError';
import HousingMissingError from '~/errors/housingMissingError';
import HousingUpdateForbiddenError from '~/errors/housingUpdateForbiddenError';
import PrecisionMissingError from '~/errors/precisionMissingError';
import { startKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import type { AddressApi } from '~/models/AddressApi';
import { type DocumentApi } from '~/models/DocumentApi';
import {
  HousingEventApi,
  type HousingDocumentEventApi,
  type HousingOwnerEventApi,
  type OwnerEventApi,
  type PrecisionHousingEventApi
} from '~/models/EventApi';
import {
  diffHousingOccupancyUpdated,
  diffHousingStatusUpdated,
  fromDatafoncierHousing,
  HousingApi,
  HousingSortableApi,
  isContacted,
  toHousingDTO,
  type HousingId
} from '~/models/HousingApi';
import { HousingCountApi } from '~/models/HousingCountApi';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { NoteApi, type HousingNoteApi } from '~/models/NoteApi';
import { fromDatafoncierOwner, type OwnerApi } from '~/models/OwnerApi';
import { createPagination, DEFAULT_PAGINATION } from '~/models/PaginationApi';
import { type PrecisionApi } from '~/models/PrecisionApi';
import sortApi from '~/models/SortApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import createDatafoncierOwnersRepository from '~/repositories/datafoncierOwnersRepository';
import documentRepository from '~/repositories/documentRepository';
import establishmentRepository from '~/repositories/establishmentRepository';
import eventRepository from '~/repositories/eventRepository';
import housingDocumentRepository from '~/repositories/housingDocumentRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import housingRepository, {
  type CountOptions
} from '~/repositories/housingRepository';
import noteRepository from '~/repositories/noteRepository';
import ownerRepository, {
  refreshMultiOwnerFlags
} from '~/repositories/ownerRepository';
import precisionRepository from '~/repositories/precisionRepository';
import { createBanAPI } from '~/services/ban/ban-api';

const logger = createLogger('housingController');
const banAPI = createBanAPI();

interface HousingPathParams extends Record<string, string> {
  id: string;
}

const get: RequestHandler<
  { id: HousingDTO['id'] },
  HousingApi,
  never,
  never
> = async (request, response): Promise<void> => {
  const { params, establishment, effectiveGeoCodes } =
    request as AuthenticatedRequest<
      { id: HousingDTO['id'] },
      HousingApi,
      never,
      never
    >;

  logger.info('Get housing', params.id);

  const id = params.id.length !== 12 ? params.id : undefined;
  const localId = params.id.length === 12 ? params.id : undefined;

  // effectiveGeoCodes is undefined when no restriction applies, use all establishment geoCodes
  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: effectiveGeoCodes ?? establishment.geoCodes,
    id,
    localId,
    includes: ['owner', 'perimeters', 'campaigns']
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
};

type HousingQuery = HousingFiltersDTO &
  Partial<Pagination> & { sort?: string[]; fields?: HousingPointField[] };

const list: RequestHandler<
  never,
  ReadonlyArray<Partial<HousingDTO> & Pick<HousingDTO, 'id'>>,
  never,
  HousingQuery
> = async (request, response): Promise<void> => {
  const { auth, establishment, user, query, effectiveGeoCodes } =
    request as AuthenticatedRequest<
      never,
      ReadonlyArray<Partial<HousingDTO> & Pick<HousingDTO, 'id'>>,
      never,
      HousingQuery
    >;
  logger.debug('List housings', { query, effectiveGeoCodes });

  const { fields, paginate, page, perPage, sort, ...rawFilters } = query;
  const pagination = createPagination({
    page: page ?? DEFAULT_PAGINATION.page,
    perPage: perPage ?? DEFAULT_PAGINATION.perPage,
    paginate
  });

  const isAdminOrVisitor = [UserRole.ADMIN, UserRole.VISITOR].includes(
    user.role
  );
  const intercommunalities =
    query.intercommunalities !== undefined
      ? await establishmentRepository
          .find({ filters: { id: query.intercommunalities } })
          .then((establishments) =>
            establishments.flatMap((establishment) => establishment.geoCodes)
          )
      : null;
  const localities = pipe(
    establishment.geoCodes,
    (geoCodes) =>
      effectiveGeoCodes !== undefined
        ? Array.intersection(geoCodes, effectiveGeoCodes)
        : geoCodes,
    (geoCodes) =>
      intercommunalities !== null
        ? Array.intersection(geoCodes, intercommunalities)
        : geoCodes,
    (geoCodes) =>
      query.localities !== undefined
        ? Array.intersection(geoCodes, query.localities)
        : geoCodes
  );

  // No commune the user is allowed to see: short-circuit to an empty list
  // (find applies `localities` as-is and would otherwise scan all).
  if (localities.length === 0) {
    response.status(constants.HTTP_STATUS_OK).json([]);
    return;
  }

  const filters: HousingFiltersApi = {
    ...rawFilters,
    establishmentIds:
      isAdminOrVisitor && rawFilters.establishmentIds?.length
        ? rawFilters.establishmentIds
        : [auth.establishmentId],
    localities
  };

  // Sparse map projection (fields) has no owner/campaign joins and no sort;
  // full hydration carries includes + sort.
  const entitiesQuery = fields?.length
    ? housingRepository.find({ filters, fields, pagination })
    : housingRepository
        .find({
          filters,
          includes: ['owner', 'campaigns'],
          sort: sortApi.parse<HousingSortableApi>(sort),
          pagination
        })
        .then((housings) => housings.map(toHousingDTO));
  const entities = await entitiesQuery;

  // The list returns only housings: the total is NOT computed here. Counting the
  // whole filtered set on every request would tie each page's latency to a full
  // count (owner join + `count(distinct)`) and recompute it on every page turn.
  // Clients read the total from `GET /housings/count`, which RTK Query caches
  // per filter-set.
  response.status(constants.HTTP_STATUS_OK).json(entities);
};

const count: RequestHandler<
  never,
  HousingCountApi | Record<HousingStatus, HousingCountApi>,
  never,
  HousingFiltersDTO
> = async (request, response): Promise<void> => {
  const { auth, establishment, query, effectiveGeoCodes } =
    request as AuthenticatedRequest<
      never,
      HousingCountApi | Record<HousingStatus, HousingCountApi>,
      never,
      HousingFiltersDTO
    >;
  logger.debug('Count housings', { query });

  const { groupBy, ...queryFilters } = query as HousingFiltersDTO & {
    groupBy?: 'status';
  };

  const isAdminOrVisitor = [UserRole.ADMIN, UserRole.VISITOR].includes(
    auth.role
  );

  const intercommunalities =
    query.intercommunalities !== undefined
      ? await establishmentRepository
          .find({ filters: { id: query.intercommunalities } })
          .then((establishments) =>
            establishments.flatMap((establishment) => establishment.geoCodes)
          )
      : null;
  const localities = pipe(
    establishment.geoCodes,
    (geoCodes) =>
      effectiveGeoCodes !== undefined
        ? Array.intersection(geoCodes, effectiveGeoCodes)
        : geoCodes,
    (geoCodes) =>
      intercommunalities !== null
        ? Array.intersection(geoCodes, intercommunalities)
        : geoCodes,
    (geoCodes) =>
      query.localities !== undefined
        ? Array.intersection(geoCodes, query.localities)
        : geoCodes
  );

  const filters: CountOptions['filters'] = {
    ...queryFilters,
    establishmentIds:
      isAdminOrVisitor && query.establishmentIds?.length
        ? query.establishmentIds
        : [auth.establishmentId],
    localities
  };

  const count =
    groupBy === 'status'
      ? await housingRepository.count({ filters, groupBy: 'status' })
      : await housingRepository.count({ filters });
  response.status(constants.HTTP_STATUS_OK).json(count);
};

const datafoncierHousingRepository = createDatafoncierHousingRepository();
const datafoncierOwnerRepository = createDatafoncierOwnersRepository();

interface HousingCreationPayload {
  localId: string;
}

const create: RequestHandler<
  never,
  HousingDTO,
  HousingCreationPayload,
  never
> = async (request, response): Promise<void> => {
  const { auth, body, establishment, effectiveGeoCodes } =
    request as AuthenticatedRequest<
      never,
      HousingDTO,
      HousingCreationPayload,
      never
    >;

  // effectiveGeoCodes is undefined when no restriction applies, use all establishment geoCodes
  const allowedGeoCodes = effectiveGeoCodes ?? establishment.geoCodes;

  const existing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: allowedGeoCodes,
    localId: body.localId
  });
  if (existing) {
    throw new HousingExistsError(body.localId);
  }

  const datafoncierHousing = await datafoncierHousingRepository.findOne({
    idlocal: body.localId
  });
  if (
    !datafoncierHousing ||
    !allowedGeoCodes.includes(datafoncierHousing.idcom)
  ) {
    throw new HousingMissingError(body.localId);
  }

  const datafoncierOwners =
    await datafoncierOwnerRepository.findDatafoncierOwners({
      filters: {
        idprocpte: datafoncierHousing.idprocpte
      }
    });

  const existingOwners = (await ownerRepository.find({
    filters: {
      idpersonne: datafoncierOwners.map((owner) => owner.idpersonne)
    },
    pagination: {
      paginate: false
    }
  })) as Array<Omit<OwnerApi, 'idpersonne'> & { idpersonne: string }>;
  const missingOwners = pipe(
    datafoncierOwners,
    Array.filter((datafoncierOwner) => {
      // Keep owners that do not exist
      return !Array.containsWith<{ idpersonne: string }>(
        DATAFONCIER_OWNER_EQUIVALENCE
      )(existingOwners, datafoncierOwner);
    }),
    Array.map(fromDatafoncierOwner)
  );
  logger.debug('Owners found from Datafoncier owners', {
    idprocpte: datafoncierHousing.idprocpte,
    existing: existingOwners,
    missing: missingOwners
  });

  const housing = fromDatafoncierHousing(datafoncierHousing, {
    dataYears: 2024,
    dataFileYears: 'ff-2024',
    source: 'datafoncier-manual'
  });

  // Fetch BAN address
  const addresses = datafoncierHousing.ban_geom
    ? await banAPI.reverseMany([
        {
          longitude: datafoncierHousing.ban_geom.coordinates[0],
          latitude: datafoncierHousing.ban_geom.coordinates[1]
        }
      ])
    : null;
  const address =
    addresses?.find((address) => address.id === datafoncierHousing.ban_id) ??
    null;
  const banAddress: AddressApi | null = address
    ? {
        refId: housing.id,
        addressKind: AddressKinds.Housing,
        banId: address.id,
        label: address.label,
        houseNumber: address.houseNumber,
        street: address.street,
        postalCode: address.postalCode,
        city: address.city,
        latitude: address.latitude,
        longitude: address.longitude,
        score: address.score,
        lastUpdatedAt: new Date().toISOString()
      }
    : null;
  const housingOwners = existingOwners
    .concat(missingOwners)
    .map<Omit<HousingOwnerApi, keyof OwnerApi>>((owner) => {
      const datafoncierOwner = datafoncierOwners.find(
        (datafoncierOwner) => datafoncierOwner.idpersonne === owner.idpersonne
      );
      if (!datafoncierOwner) {
        // Should not happen
        throw new Error('Datafoncier owner not found for existing owner');
      }
      const rank: ActiveOwnerRank = toActiveRank(datafoncierOwner.dnulp);
      const locprop: number | null = datafoncierOwner.locprop
        ? toSourceRelativeLocation(datafoncierOwner.locprop)
        : null;

      return {
        housingGeoCode: housing.geoCode,
        housingId: housing.id,
        ownerId: owner.id,
        rank: rank,
        startDate: new Date().toJSON().substring(0, 'yyyy-mm-dd'.length),
        endDate: null,
        origin: 'datafoncier-manual',
        idprocpte: datafoncierOwner.idprocpte,
        idprodroit: datafoncierOwner.idprodroit,
        locprop: locprop,
        propertyRight: toPropertyRight(datafoncierOwner.ccodro),
        relativeLocation: null,
        absoluteDistance: null
      };
    });

  const housingEvents: HousingEventApi[] = [
    {
      id: uuidv4(),
      type: 'housing:created',
      nextOld: null,
      nextNew: {
        occupancy: OCCUPANCY_LABELS[housing.occupancy],
        source: 'datafoncier-manual'
      },
      createdAt: new Date().toISOString(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    }
  ];
  const ownerEvents: OwnerEventApi[] = missingOwners.map<OwnerEventApi>(
    (owner) => ({
      id: uuidv4(),
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
    })
  );
  const housingOwnerEvents: HousingOwnerEventApi[] =
    housingOwners.map<HousingOwnerEventApi>((housingOwner) => {
      const owner = existingOwners.concat(missingOwners).find((owner) => {
        return owner.id === housingOwner.ownerId;
      }) as OwnerApi;
      return {
        id: uuidv4(),
        type: 'housing:owner-attached',
        nextOld: null,
        nextNew: {
          name: owner.fullName,
          rank: housingOwner.rank
        },
        createdAt: new Date().toISOString(),
        createdBy: auth.userId,
        housingGeoCode: housingOwner.housingGeoCode,
        housingId: housingOwner.housingId,
        ownerId: housingOwner.ownerId
      };
    });

  await startKyselyTransaction(async () => {
    await Promise.all([
      housingRepository.save(housing),
      ownerRepository.betterSaveMany(missingOwners, {
        onConflict: ['idpersonne'],
        merge: false
      })
    ]);
    const affectedOwnerIds =
      await housingOwnerRepository.saveMany(housingOwners);
    await Promise.all([
      refreshMultiOwnerFlags(affectedOwnerIds),
      banAddress ? banAddressesRepository.save(banAddress) : Promise.resolve(),
      eventRepository.insertManyHousingEvents(housingEvents),
      eventRepository.insertManyOwnerEvents(ownerEvents),
      eventRepository.insertManyHousingOwnerEvents(housingOwnerEvents)
    ]);
  });
  response
    .status(constants.HTTP_STATUS_CREATED)
    .location(`housing/${housing.id}`)
    .json(toHousingDTO(housing));
};

export interface HousingUpdateBody {
  statusUpdate?: Pick<HousingApi, 'status' | 'subStatus'>;
  occupancyUpdate?: Pick<HousingApi, 'occupancy' | 'occupancyIntended'>;
  note?: Pick<NoteApi, 'content' | 'noteKind'>;
}

const update: RequestHandler<
  HousingPathParams,
  HousingDTO,
  HousingUpdatePayloadDTO,
  never
> = async (request, response): Promise<void> => {
  const { auth, body, establishment, effectiveGeoCodes, params } =
    request as AuthenticatedRequest<
      HousingPathParams,
      HousingDTO,
      HousingUpdatePayloadDTO,
      never
    >;

  // effectiveGeoCodes is undefined when no restriction applies, use all establishment geoCodes
  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    id: params.id,
    geoCode: effectiveGeoCodes ?? establishment.geoCodes,
    includes: ['owner']
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  const updated: HousingApi = {
    ...housing,
    status: body.status,
    subStatus: body.subStatus,
    occupancy: body.occupancy,
    occupancyIntended: body.occupancyIntended,
    actualEnergyConsumption: body.actualEnergyConsumption
  };

  const housingStatusDiff = diffHousingStatusUpdated(
    {
      status: HOUSING_STATUS_LABELS[housing.status],
      subStatus: housing.subStatus
    },
    {
      status: HOUSING_STATUS_LABELS[updated.status],
      subStatus: updated.subStatus
    }
  );
  const housingOccupancyDiff = diffHousingOccupancyUpdated(
    {
      occupancy: OCCUPANCY_LABELS[housing.occupancy],
      occupancyIntended: housing.occupancyIntended
        ? OCCUPANCY_LABELS[housing.occupancyIntended]
        : null
    },
    {
      occupancy: OCCUPANCY_LABELS[updated.occupancy],
      occupancyIntended: updated.occupancyIntended
        ? OCCUPANCY_LABELS[updated.occupancyIntended]
        : null
    }
  );

  const events: HousingEventApi[] = [];
  if (housingStatusDiff.changed.length > 0) {
    events.push({
      id: uuidv4(),
      type: 'housing:status-updated',
      nextOld: housingStatusDiff.before,
      nextNew: housingStatusDiff.after,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    });
  }
  if (housingOccupancyDiff.changed.length > 0) {
    events.push({
      id: uuidv4(),
      type: 'housing:occupancy-updated',
      nextOld: housingOccupancyDiff.before,
      nextNew: housingOccupancyDiff.after,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    });
  }
  if (housing.actualEnergyConsumption !== updated.actualEnergyConsumption) {
    events.push({
      id: uuidv4(),
      type: 'housing:updated',
      nextOld: {
        actualEnergyConsumption: housing.actualEnergyConsumption
      },
      nextNew: {
        actualEnergyConsumption: updated.actualEnergyConsumption
      },
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    });
  }

  await startKyselyTransaction(async () => {
    await Promise.all([
      housingRepository.update(updated),
      eventRepository.insertManyHousingEvents(events)
    ]);
  });

  response.status(constants.HTTP_STATUS_OK).json(toHousingDTO(updated));
};

const updateMany: RequestHandler<
  never,
  ReadonlyArray<HousingDTO>,
  HousingBatchUpdatePayload,
  never
> = async (request, response): Promise<void> => {
  const { body, establishment, user, effectiveGeoCodes } =
    request as AuthenticatedRequest<
      never,
      ReadonlyArray<HousingDTO>,
      HousingBatchUpdatePayload,
      never
    >;
  logger.info('Updating many housings...', { body });

  const isAdminOrVisitor = [UserRole.ADMIN, UserRole.VISITOR].includes(
    user.role
  );
  // Geo resolution lives in the app layer: bound the update to the
  // establishment's perimeter (the user's effective geo codes, falling back to
  // the whole establishment) narrowed by any caller-provided localities.
  const perimeter = effectiveGeoCodes ?? establishment.geoCodes;
  const localities = body.filters.localities?.length
    ? Array.intersection(perimeter, body.filters.localities)
    : perimeter;
  const [housings, referential] = await Promise.all([
    housingRepository.find({
      filters: {
        ...body.filters,
        establishmentIds:
          isAdminOrVisitor && body.filters.establishmentIds?.length
            ? body.filters.establishmentIds
            : [establishment.id],
        localities
      },
      includes: ['campaigns', 'owner', 'precisions'],
      pagination: { paginate: false }
    }),
    precisionRepository.find().then((precisions) => {
      return HashMap.fromIterable(
        precisions.map((precision) => [precision.id, precision])
      );
    })
  ]);

  const contactedHousings = housings.filter(isContacted);
  if (
    contactedHousings.length > 0 &&
    body.status === HousingStatus.NEVER_CONTACTED
  ) {
    throw new HousingUpdateForbiddenError(
      ...contactedHousings.map((housing) => housing.id)
    );
  }

  const [precisionsMissing, precisionsFound] = pipe(
    body.precisions ?? [],
    Array.partitionMap((id) => {
      return HashMap.has(referential, id)
        ? Either.right(HashMap.unsafeGet(referential, id))
        : Either.left(id);
    })
  );
  if (precisionsMissing.length > 0) {
    throw new PrecisionMissingError(...precisionsMissing);
  }

  const notes: ReadonlyArray<HousingNoteApi> =
    housings.length && body.note
      ? housings.map<HousingNoteApi>((housing) => ({
          id: uuidv4(),
          content: body.note as string,
          noteKind: 'Note courante',
          creator: user,
          createdBy: user.id,
          createdAt: new Date().toJSON(),
          updatedAt: null,
          deletedAt: null,
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        }))
      : [];
  const events: ReadonlyArray<HousingEventApi> =
    housings.flatMap<HousingEventApi>((housing) => {
      const occupancyDiff = diffHousingOccupancyUpdated(
        {
          occupancy:
            body.occupancy !== undefined && housing.occupancy !== undefined
              ? OCCUPANCY_LABELS[housing.occupancy]
              : undefined,
          occupancyIntended:
            body.occupancyIntended !== undefined
              ? match(housing.occupancyIntended)
                  .with(null, () => null)
                  .with(
                    Pattern.nonNullable,
                    (occupancy) => OCCUPANCY_LABELS[occupancy]
                  )
                  .otherwise(() => undefined)
              : undefined
        },
        {
          occupancy:
            body.occupancy !== undefined
              ? OCCUPANCY_LABELS[body.occupancy]
              : undefined,
          occupancyIntended:
            body.occupancyIntended !== undefined
              ? OCCUPANCY_LABELS[body.occupancyIntended]
              : undefined
        }
      );
      const statusDiff = diffHousingStatusUpdated(
        {
          status:
            body.status !== undefined && housing.status !== undefined
              ? HOUSING_STATUS_LABELS[housing.status]
              : undefined,
          subStatus:
            body.subStatus !== undefined && housing.subStatus !== undefined
              ? housing.subStatus
              : undefined
        },
        {
          status:
            body.status !== undefined
              ? HOUSING_STATUS_LABELS[body.status]
              : undefined,
          subStatus: body.subStatus !== undefined ? body.subStatus : undefined
        }
      );

      const events: HousingEventApi[] = [];
      if (occupancyDiff.changed.length > 0) {
        events.push({
          id: uuidv4(),
          type: 'housing:occupancy-updated',
          nextOld: occupancyDiff.before,
          nextNew: occupancyDiff.after,
          createdAt: new Date().toJSON(),
          createdBy: user.id,
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        });
      }
      if (statusDiff.changed.length > 0) {
        events.push({
          id: uuidv4(),
          type: 'housing:status-updated',
          nextOld: statusDiff.before,
          nextNew: statusDiff.after,
          createdAt: new Date().toJSON(),
          createdBy: user.id,
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        });
      }

      return events;
    });
  const ids: ReadonlyArray<HousingId> = housings.map(
    Struct.pick('geoCode', 'id')
  );

  // Build precision links for add-only updates
  const precisionLinks =
    precisionsFound.length && housings.length > 0
      ? housings.map((housing: HousingApi) => {
          const union = pipe(
            precisionsFound,
            Array.filter(
              (precision) =>
                !isSingleChoicePrecisionCategory(precision.category)
            ),
            Array.unionWith(
              housing.precisions?.filter(
                (precision) =>
                  !isSingleChoicePrecisionCategory(precision.category)
              ) ?? [],
              PRECISION_EQUIVALENCE
            ),
            // For single-choice categories, remove existing ones of the same category
            Array.appendAll(
              pipe(
                precisionsFound,
                Array.filter((precision) =>
                  isSingleChoicePrecisionCategory(precision.category)
                ),
                Array.unionWith(
                  housing.precisions?.filter((precision) =>
                    isSingleChoicePrecisionCategory(precision.category)
                  ) ?? [],
                  PRECISION_CATEGORY_EQUIVALENCE
                )
              )
            )
          );
          const substract = Array.differenceWith(PRECISION_EQUIVALENCE);
          const added = substract(union, housing.precisions ?? []);

          return {
            housing,
            precisions: union,
            events: added.map<PrecisionHousingEventApi>((precision) => ({
              id: uuidv4(),
              type: 'housing:precision-attached',
              nextOld: null,
              nextNew: {
                category: precision.category,
                label: precision.label
              },
              createdAt: new Date().toJSON(),
              createdBy: user.id,
              precisionId: precision.id,
              housingGeoCode: housing.geoCode,
              housingId: housing.id
            }))
          };
        })
      : [];
  const precisionEvents = precisionLinks.flatMap((link) => link.events);

  // Validate documents if provided
  const shouldLinkDocuments = body.documents?.length && housings.length;
  let documents: DocumentApi[] = [];
  if (shouldLinkDocuments) {
    logger.info('Linking documents to housings', {
      documentCount: body.documents!.length,
      housingCount: housings.length
    });

    // Validate documents exist and belong to establishment
    documents = await documentRepository.find({
      filters: {
        ids: body.documents!,
        establishmentIds: [establishment.id],
        deleted: false
      }
    });

    if (documents.length !== body.documents!.length) {
      const foundIds = documents.map((document) => document.id);
      const missingIds = body.documents!.filter((id) => !foundIds.includes(id));
      throw new DocumentMissingError(...missingIds);
    }
  }

  // Create housing:document-attached events (cartesian product)
  const documentAttachEvents: ReadonlyArray<HousingDocumentEventApi> =
    shouldLinkDocuments && body.documents
      ? body.documents
          .map((id) => documents.find((document) => document.id === id))
          .filter(Predicate.isNotNullable)
          .flatMap((document) => {
            return housings.map((housing) => ({
              id: uuidv4(),
              type: 'housing:document-attached',
              nextOld: null,
              nextNew: { filename: document.filename },
              createdAt: new Date().toJSON(),
              createdBy: user.id,
              documentId: document.id,
              housingGeoCode: housing.geoCode,
              housingId: housing.id
            }));
          })
      : [];

  await startKyselyTransaction(async () => {
    await Promise.all([
      housingRepository.updateMany(ids, {
        status: body.status,
        subStatus: body.subStatus,
        occupancy: body.occupancy,
        occupancyIntended: body.occupancyIntended
      }),
      noteRepository.createManyByHousing(notes),
      eventRepository.insertManyHousingEvents(events),
      // Add precisions to housings (if requested)
      precisionLinks.length
        ? precisionRepository.linkMany(
            precisionLinks.map((link) => ({
              housing: link.housing,
              precisions: link.precisions
            })) as ReadonlyArray<{
              housing: HousingApi;
              precisions: ReadonlyArray<PrecisionApi>;
            }>
          )
        : Promise.resolve(),
      // Insert precision events (if any)
      precisionEvents.length > 0
        ? eventRepository.insertManyPrecisionHousingEvents(precisionEvents)
        : Promise.resolve(),
      // Link documents (if any) - create cartesian product
      shouldLinkDocuments
        ? housingDocumentRepository.linkMany(
            body.documents!.flatMap((documentId) =>
              housings.map((housing) => ({
                document_id: documentId,
                housing_id: housing.id,
                housing_geo_code: housing.geoCode
              }))
            )
          )
        : Promise.resolve(),
      // Insert document attach events (if any)
      documentAttachEvents.length > 0
        ? eventRepository.insertManyHousingDocumentEvents(documentAttachEvents)
        : Promise.resolve()
    ]);
  });

  const updated = compactUndefined({
    status: body.status,
    subStatus: body.subStatus,
    occupancy: body.occupancy,
    occupancyIntended: body.occupancyIntended
  });
  const updatedHousings =
    Object.keys(updated).length > 0
      ? housings.map((housing) => ({
          ...housing,
          ...updated
        }))
      : housings;
  response
    .status(constants.HTTP_STATUS_OK)
    .json(updatedHousings.map(toHousingDTO));
};

const housingController = {
  get,
  list,
  count,
  create,
  update,
  updateMany
};

export default housingController;
