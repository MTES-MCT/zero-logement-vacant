import {
  AddressKinds,
  DATAFONCIER_OWNER_EQUIVALENCE,
  HOUSING_STATUS_LABELS,
  HousingDTO,
  HousingFiltersDTO,
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
import { compactNullable } from '@zerologementvacant/utils';
import { Array, Either, HashMap, pipe, Record, Struct } from 'effect';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { oneOf, param } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import DocumentMissingError from '~/errors/documentMissingError';
import HousingExistsError from '~/errors/housingExistsError';
import HousingMissingError from '~/errors/housingMissingError';
import HousingUpdateForbiddenError from '~/errors/housingUpdateForbiddenError';
import PrecisionMissingError from '~/errors/precisionMissingError';
import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import type { AddressApi } from '~/models/AddressApi';
import {
  HousingEventApi,
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
import {
  HousingPaginatedDTO,
  HousingPaginatedResultApi
} from '~/models/PaginatedResultApi';
import { type PrecisionApi } from '~/models/PrecisionApi';
import sortApi from '~/models/SortApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import createDatafoncierOwnersRepository from '~/repositories/datafoncierOwnersRepository';
import documentHousingRepository from '~/repositories/documentHousingRepository';
import documentRepository from '~/repositories/documentRepository';
import eventRepository from '~/repositories/eventRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';

import housingRepository from '~/repositories/housingRepository';
import noteRepository from '~/repositories/noteRepository';
import ownerRepository from '~/repositories/ownerRepository';
import precisionRepository from '~/repositories/precisionRepository';
import { createBanAPI } from '~/services/ban/ban-api';

const logger = createLogger('housingController');
const banAPI = createBanAPI();

interface HousingPathParams extends Record<string, string> {
  id: string;
}

const getValidators = oneOf([
  param('id').isString().isLength({ min: 12, max: 12 }), // localId
  param('id').isUUID() // id
]);
async function get(request: Request, response: Response) {
  const { params, establishment } = request as AuthenticatedRequest;

  logger.info('Get housing', params.id);

  const id = params.id.length !== 12 ? params.id : undefined;
  const localId = params.id.length === 12 ? params.id : undefined;

  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: establishment.geoCodes,
    id,
    localId,
    includes: ['owner', 'perimeters', 'campaigns']
  });
  if (!housing) {
    throw new HousingMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
}

type ListHousingPayload = Pagination & {
  filters?: HousingFiltersDTO;
};

type HousingQuery = HousingFiltersDTO &
  Partial<Pagination> & { sort?: string[] };

const list: RequestHandler<
  never,
  HousingPaginatedDTO,
  ListHousingPayload,
  HousingQuery
> = async (request, response): Promise<void> => {
  const { auth, user, query } = request as AuthenticatedRequest<
    never,
    HousingPaginatedResultApi,
    ListHousingPayload,
    HousingQuery
  >;

  const pagination: Pagination = {
    paginate: query.paginate,
    page: query.page ?? 1,
    perPage: query.perPage ?? 50
  };
  const role = user.role;
  const sort = sortApi.parse<HousingSortableApi>(query.sort);
  const rawFilters = Struct.omit(query, 'paginate', 'page', 'perPage', 'sort');
  const filters: HousingFiltersApi = {
    ...rawFilters,
    establishmentIds:
      [UserRole.ADMIN, UserRole.VISITOR].includes(role) &&
      rawFilters?.establishmentIds?.length
        ? rawFilters?.establishmentIds
        : [auth.establishmentId]
  };

  logger.debug('List housing', {
    pagination,
    filters,
    sort
  });

  const [housings, count] = await Promise.all([
    housingRepository.find({
      filters,
      pagination,
      sort,
      includes: ['owner', 'campaigns']
    }),
    // Kept for backward-compatibility
    // TODO: remove this
    Promise.resolve({ housing: 1, owners: 1 })
  ]);

  const offset = (pagination.page - 1) * pagination.perPage;
  response
    .status(constants.HTTP_STATUS_OK)
    .setHeader(
      'Content-Range',
      `housing ${offset}-${offset + housings.length - 1}/${count.housing}`
    )
    .json({
      entities: housings.map(toHousingDTO),
      filteredCount: count.housing,
      filteredOwnerCount: count.owners,
      page: pagination.page,
      perPage: pagination.perPage,
      totalCount: 0
    });
};

const count: RequestHandler<
  never,
  HousingCountApi,
  never,
  HousingFiltersDTO
> = async (request, response): Promise<void> => {
  const { auth, query } = request as AuthenticatedRequest<
    never,
    HousingCountApi,
    never,
    HousingFiltersDTO
  >;
  logger.debug('Count housings', { query });

  const count = await housingRepository.count({
    ...query,
    establishmentIds:
      [UserRole.ADMIN, UserRole.VISITOR].includes(auth.role) &&
      query.establishmentIds?.length
        ? query.establishmentIds
        : [auth.establishmentId]
  });
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
  const { auth, body, establishment } = request as AuthenticatedRequest<
    never,
    HousingDTO,
    HousingCreationPayload,
    never
  >;

  const existing = await housingRepository.findOne({
    establishment: establishment.id,
    geoCode: establishment.geoCodes,
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
    !establishment.geoCodes.includes(datafoncierHousing.idcom)
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
        startDate: new Date(),
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
      name: 'Création du logement',
      nextOld: null,
      nextNew: {
        occupancy: OCCUPANCY_LABELS[housing.occupancy],
        source: 'datafoncier-manual'
      },
      createdAt: new Date().toISOString(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id,
      conflict: false
    }
  ];
  const ownerEvents: OwnerEventApi[] = missingOwners.map<OwnerEventApi>(
    (owner) => ({
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
        name: 'Propriétaire ajouté au logement',
        nextOld: null,
        nextNew: {
          name: owner.fullName,
          rank: housingOwner.rank
        },
        createdAt: new Date().toISOString(),
        createdBy: auth.userId,
        housingGeoCode: housingOwner.housingGeoCode,
        housingId: housingOwner.housingId,
        ownerId: housingOwner.ownerId,
        conflict: false
      };
    });

  await startTransaction(async () => {
    await Promise.all([
      housingRepository.save(housing),
      ownerRepository.betterSaveMany(missingOwners, {
        onConflict: ['idpersonne'],
        merge: false
      })
    ]);
    await housingOwnerRepository.saveMany(housingOwners);
    await Promise.all([
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
  statusUpdate?: Pick<
    HousingApi,
    'status' | 'subStatus' | 'deprecatedPrecisions' | 'deprecatedVacancyReasons'
  >;
  occupancyUpdate?: Pick<HousingApi, 'occupancy' | 'occupancyIntended'>;
  note?: Pick<NoteApi, 'content' | 'noteKind'>;
}

async function update(
  request: Request<HousingPathParams, HousingDTO, HousingUpdatePayloadDTO>,
  response: Response
): Promise<void> {
  const { auth, body, establishment, params } = request as AuthenticatedRequest<
    HousingPathParams,
    HousingDTO,
    HousingUpdatePayloadDTO
  >;

  const housing = await housingRepository.findOne({
    establishment: establishment.id,
    id: params.id,
    geoCode: establishment.geoCodes,
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
    occupancyIntended: body.occupancyIntended
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
      name: 'Changement de statut de suivi',
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
      name: "Modification du statut d'occupation",
      nextOld: housingOccupancyDiff.before,
      nextNew: housingOccupancyDiff.after,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    });
  }

  await startTransaction(async () => {
    await Promise.all([
      housingRepository.update(updated),
      eventRepository.insertManyHousingEvents(events)
    ]);
  });

  response.status(constants.HTTP_STATUS_OK).json(toHousingDTO(updated));
}

const updateMany: RequestHandler<
  never,
  ReadonlyArray<HousingDTO>,
  HousingBatchUpdatePayload
> = async (request, response): Promise<void> => {
  const { body, establishment, user } = request as AuthenticatedRequest<
    never,
    ReadonlyArray<HousingDTO>,
    HousingBatchUpdatePayload
  >;
  logger.info('Updating many housings...', { body });

  const [housings, referential] = await Promise.all([
    housingRepository.find({
      filters: {
        ...body.filters,
        establishmentIds:
          [UserRole.ADMIN, UserRole.VISITOR].includes(user.role) &&
          body.filters.establishmentIds?.length
            ? body.filters.establishmentIds
            : [establishment.id]
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
          occupancy: body.occupancy
            ? OCCUPANCY_LABELS[housing.occupancy]
            : undefined,
          occupancyIntended:
            body.occupancyIntended && housing.occupancyIntended
              ? OCCUPANCY_LABELS[housing.occupancyIntended]
              : undefined
        },
        {
          occupancy: body.occupancy
            ? OCCUPANCY_LABELS[body.occupancy]
            : undefined,
          occupancyIntended: body.occupancyIntended
            ? OCCUPANCY_LABELS[body.occupancyIntended]
            : undefined
        }
      );
      const statusDiff = diffHousingStatusUpdated(
        {
          status: body.status
            ? HOUSING_STATUS_LABELS[housing.status]
            : undefined,
          subStatus: body.subStatus ? housing.subStatus : undefined
        },
        {
          status: body.status ? HOUSING_STATUS_LABELS[body.status] : undefined,
          subStatus: body.subStatus ? body.subStatus : undefined
        }
      );

      const events: HousingEventApi[] = [];
      if (occupancyDiff.changed.length > 0) {
        events.push({
          id: uuidv4(),
          type: 'housing:occupancy-updated',
          name: "Modification du statut d'occupation",
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
          name: 'Changement de statut de suivi',
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
              name: 'Ajout d’une précision au logement',
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

  // Validate and prepare document links if provided
  const documentLinks =
    body.documents?.length && housings.length
      ? await (async () => {
          logger.info('Linking documents to housings', {
            documentCount: body.documents!.length,
            housingCount: housings.length
          });

          // Validate documents exist and belong to establishment
          const documents = await documentRepository.find({
            filters: {
              ids: body.documents!,
              establishmentIds: [establishment.id],
              deleted: false
            }
          });

          if (documents.length !== body.documents!.length) {
            const foundIds = documents.map(document => document.id);
            const missingIds = body.documents!.filter(id => !foundIds.includes(id));
            throw new DocumentMissingError(...missingIds);
          }

          // Create links (cartesian product: documents × housings)
          return housings.flatMap(housing =>
            body.documents!.map(documentId => ({
              ...documents.find(doc => doc.id === documentId)!,
              housingId: housing.id,
              housingGeoCode: housing.geoCode
            }))
          );
        })()
      : [];

  await startTransaction(async () => {
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
      // Link documents (if any)
      documentLinks.length > 0
        ? documentHousingRepository.createMany(documentLinks)
        : Promise.resolve()
    ]);
  });

  const updated = compactNullable({
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
  getValidators,
  get,
  list,
  count,
  create,
  update,
  updateMany
};

export default housingController;
