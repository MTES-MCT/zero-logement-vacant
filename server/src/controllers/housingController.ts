import {
  HOUSING_STATUS_LABELS,
  HousingDTO,
  HousingFiltersDTO,
  HousingStatus,
  HousingUpdatePayloadDTO,
  OCCUPANCY_LABELS,
  OCCUPANCY_VALUES,
  Pagination,
  UserRole,
  type HousingBatchUpdatePayload
} from '@zerologementvacant/models';
import { compactNullable } from '@zerologementvacant/utils';
import async from 'async';
import { Record, Struct } from 'effect';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, oneOf, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';
import HousingExistsError from '~/errors/housingExistsError';
import HousingMissingError from '~/errors/housingMissingError';
import HousingUpdateForbiddenError from '~/errors/housingUpdateForbiddenError';
import { startTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import {
  diffHousingOccupancyUpdated,
  diffHousingStatusUpdated,
  HousingApi,
  HousingRecordApi,
  HousingSortableApi,
  isContacted,
  toHousingDTO,
  type HousingId,
} from '~/models/HousingApi';
import { HousingCountApi } from '~/models/HousingCountApi';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { toHousingOwnersApi } from '~/models/HousingOwnerApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { NoteApi, type HousingNoteApi } from '~/models/NoteApi';
import {
  HousingPaginatedDTO,
  HousingPaginatedResultApi
} from '~/models/PaginatedResultApi';
import sortApi from '~/models/SortApi';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import createDatafoncierOwnersRepository from '~/repositories/datafoncierOwnersRepository';
import eventRepository from '~/repositories/eventRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';

import housingRepository from '~/repositories/housingRepository';
import noteRepository from '~/repositories/noteRepository';
import ownerRepository from '~/repositories/ownerRepository';
import { toHousingRecordApi, toOwnerApi } from '~/scripts/shared';

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

const createValidators: ValidationChain[] = [
  body('localId').isString().isLength({ min: 12, max: 12 })
];
async function create(request: Request, response: Response) {
  const { auth, body, establishment } = request as AuthenticatedRequest;

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
  if (!datafoncierHousing) {
    throw new HousingMissingError(body.localId);
  }

  const datafoncierOwners =
    await datafoncierOwnerRepository.findDatafoncierOwners({
      filters: {
        idprocpte: datafoncierHousing.idprocpte
      }
    });
  // Create the missing datafoncier owners if needed
  await async.forEach(datafoncierOwners, async (datafoncierOwner) => {
    const owner = toOwnerApi(datafoncierOwner);
    await ownerRepository.betterSave(owner, {
      onConflict: ['idpersonne'],
      merge: false
    });
  });
  const owners = await ownerRepository.find({
    filters: {
      idpersonne: datafoncierOwners.map((owner) => owner.idpersonne)
    }
  });

  const housing: HousingRecordApi = toHousingRecordApi(
    { source: 'datafoncier-manual' },
    datafoncierHousing
  );
  await housingRepository.save(housing);
  await housingOwnerRepository.saveMany(toHousingOwnersApi(housing, owners));

  await eventRepository.insertManyHousingEvents([
    {
      id: uuidv4(),
      name: 'Création du logement',
      type: 'housing:created',
      nextOld: null,
      nextNew: {
        source: 'datafoncier-manual',
        occupancy: OCCUPANCY_LABELS[housing.occupancy]
      },
      conflict: false,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    }
  ]);

  response.status(constants.HTTP_STATUS_CREATED).json(housing);
}

export interface HousingUpdateBody {
  statusUpdate?: Pick<
    HousingApi,
    'status' | 'subStatus' | 'deprecatedPrecisions' | 'deprecatedVacancyReasons'
  >;
  occupancyUpdate?: Pick<HousingApi, 'occupancy' | 'occupancyIntended'>;
  note?: Pick<NoteApi, 'content' | 'noteKind'>;
}

const updateValidators = [
  body('housingUpdate').notEmpty(),
  body('housingUpdate.statusUpdate')
    .optional()
    .custom((value) =>
      validator.isIn(String(value.status), Object.values(HousingStatusApi))
    ),
  body('housingUpdate.occupancyUpdate')
    .optional()
    .custom((value) =>
      validator.isIn(String(value.occupancy), OCCUPANCY_VALUES)
    )
    .custom(
      (value) =>
        !value.occupancyIntended ||
        validator.isIn(
          String(value.occupancyIntended),
          Object.values(OCCUPANCY_VALUES)
        )
    ),
  body('housingUpdate.note')
    .optional()
    .custom((value) => value.content && !validator.isEmpty(value.content))
];

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

  const housings = await housingRepository.find({
    filters: {
      ...body.filters,
      establishmentIds:
        [UserRole.ADMIN, UserRole.VISITOR].includes(user.role) &&
        body.filters.establishmentIds?.length
          ? body.filters.establishmentIds
          : [establishment.id]
    },
    includes: ['campaigns', 'owner'],
    pagination: { paginate: false }
  });

  const contactedHousings = housings.filter(isContacted);
  if (
    contactedHousings.length > 0 &&
    body.status === HousingStatus.NEVER_CONTACTED
  ) {
    throw new HousingUpdateForbiddenError(
      ...contactedHousings.map((housing) => housing.id)
    );
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

  await startTransaction(async () => {
    await Promise.all([
      housingRepository.updateMany(ids, {
        status: body.status,
        subStatus: body.subStatus,
        occupancy: body.occupancy,
        occupancyIntended: body.occupancyIntended
      }),
      noteRepository.createManyByHousing(notes),
      eventRepository.insertManyHousingEvents(events)
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
  createValidators,
  create,
  updateValidators,
  update,
  updateMany
};

export default housingController;