import {
  HousingDTO,
  HousingFiltersDTO,
  HousingStatus,
  HousingUpdatePayloadDTO,
  Pagination,
  toEventHousingStatus
} from '@zerologementvacant/models';
import { compactUndefined } from '@zerologementvacant/utils';
import async from 'async';
import { Record } from 'effect';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, oneOf, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import fp from 'lodash/fp';
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
  hasCampaigns,
  HousingApi,
  HousingRecordApi,
  HousingSortableApi,
  OccupancyKindApi,
  toHousingDTO
} from '~/models/HousingApi';
import { HousingCountApi } from '~/models/HousingCountApi';
import housingFiltersApi, {
  HousingFiltersApi
} from '~/models/HousingFiltersApi';
import { toHousingOwnersApi } from '~/models/HousingOwnerApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { NoteApi } from '~/models/NoteApi';
import {
  HousingPaginatedDTO,
  HousingPaginatedResultApi
} from '~/models/PaginatedResultApi';
import sortApi from '~/models/SortApi';
import { UserRoles } from '~/models/UserApi';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import createDatafoncierOwnersRepository from '~/repositories/datafoncierOwnersRepository';
import eventRepository from '~/repositories/eventRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';

import housingRepository from '~/repositories/housingRepository';
import noteRepository from '~/repositories/noteRepository';
import ownerRepository from '~/repositories/ownerRepository';
import { toHousingRecordApi, toOwnerApi } from '~/scripts/shared';
import { isArrayOf, isUUID } from '~/utils/validators';

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
    geoCode: establishment.geoCodes,
    id,
    localId,
    includes: ['events', 'owner', 'perimeters', 'campaigns']
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
  const rawFilters = fp.omit(['paginate', 'page', 'perPage', 'sort'], query);
  const filters: HousingFiltersApi = {
    ...rawFilters,
    establishmentIds:
      [UserRoles.Admin, UserRoles.Visitor].includes(role) &&
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
      [UserRoles.Admin, UserRoles.Visitor].includes(auth.role) &&
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
  const { auth, body } = request as AuthenticatedRequest;
  const geoCode = body.localId.substring(0, 5);

  const existing = await housingRepository.findOne({
    geoCode,
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
        source: 'datafoncier-manual'
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
      validator.isIn(String(value.occupancy), Object.values(OccupancyKindApi))
    )
    .custom(
      (value) =>
        !value.occupancyIntended ||
        validator.isIn(
          String(value.occupancyIntended),
          Object.values(OccupancyKindApi)
        )
    ),
  body('housingUpdate.note')
    .optional()
    .custom((value) => value.content && !validator.isEmpty(value.content))
];

async function updateNext(
  request: Request<HousingPathParams, HousingDTO, HousingUpdatePayloadDTO>,
  response: Response
): Promise<void> {
  const { auth, body, establishment, params } = request as AuthenticatedRequest<
    HousingPathParams,
    HousingDTO,
    HousingUpdatePayloadDTO
  >;

  const housing = await housingRepository.findOne({
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
      status: toEventHousingStatus(housing.status),
      subStatus: housing.subStatus
    },
    {
      status: toEventHousingStatus(updated.status),
      subStatus: updated.subStatus
    }
  );
  const housingOccupancyDiff = diffHousingOccupancyUpdated(
    {
      occupancy: housing.occupancy,
      occupancyIntended: housing.occupancyIntended
    },
    {
      occupancy: updated.occupancy,
      occupancyIntended: updated.occupancyIntended
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

const updateHousing = async (
  housingId: string,
  housingUpdate: HousingUpdateBody,
  authUser: Pick<AuthenticatedRequest, 'user' | 'establishment'>
): Promise<HousingApi> => {
  logger.trace('Update housing', {
    id: housingId,
    update: housingUpdate
  });

  const { establishment, user } = authUser;

  const housing = await housingRepository.findOne({
    id: housingId,
    geoCode: establishment.geoCodes
  });
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  const updatedHousing: HousingApi = {
    ...housing,
    ...(housingUpdate.occupancyUpdate
      ? {
          occupancy: housingUpdate.occupancyUpdate.occupancy,
          occupancyIntended: housingUpdate.occupancyUpdate.occupancyIntended
        }
      : {}),
    ...(housingUpdate.statusUpdate
      ? {
          status: housingUpdate.statusUpdate.status,
          subStatus: housingUpdate.statusUpdate.subStatus,
          deprecatedVacancyReasons:
            housingUpdate.statusUpdate.deprecatedVacancyReasons,
          deprecatedPrecisions: housingUpdate.statusUpdate.deprecatedPrecisions
        }
      : {})
  };

  await housingRepository.update(updatedHousing);

  await createHousingUpdateEvents(housing, housingUpdate, user.id);

  await createHousingUpdateNote(
    housing.id,
    housingUpdate,
    user.id,
    housing.geoCode
  );

  return updatedHousing;
};

const updateListValidators = [
  body('allHousing').isBoolean(),
  body('housingIds').custom(isArrayOf(isUUID)),
  ...housingFiltersApi.validators(),
  ...updateValidators
];

// TODO: refactor this function
async function updateList(request: Request, response: Response) {
  logger.info('Update housing list');

  const { auth, body, user } = request as AuthenticatedRequest;
  const role = user.role;
  const housingUpdateApi = <HousingUpdateBody>body.housingUpdate;
  const allHousing = <boolean>body.allHousing;
  const housingIds = body.housingIds;

  const filters: HousingFiltersApi = {
    ...body.filters,
    establishmentIds:
      [UserRoles.Admin, UserRoles.Visitor].includes(role) &&
      body.filters.establishmentIds?.length > 0
        ? body.filters.establishmentIds
        : [auth.establishmentId]
  };

  const housingList = await housingRepository
    .find({ filters, pagination: { paginate: false }, includes: ['campaigns'] })
    .then((_) =>
      _.filter((housing) =>
        allHousing
          ? !housingIds.includes(housing.id)
          : housingIds.includes(housing.id)
      )
    );

  const housingContactedWithCampaigns = housingList.filter(
    (housing) =>
      housing.status !== HousingStatus.NEVER_CONTACTED && hasCampaigns(housing)
  );
  if (
    housingUpdateApi.statusUpdate?.status === HousingStatus.NEVER_CONTACTED &&
    housingContactedWithCampaigns.length > 0
  ) {
    throw new HousingUpdateForbiddenError(
      ...housingContactedWithCampaigns.map((housing) => housing.id)
    );
  }

  const updatedHousingList = await Promise.all(
    housingList.map((housing) =>
      updateHousing(
        housing.id,
        housingUpdateApi,
        request as AuthenticatedRequest
      )
    )
  );

  response.status(constants.HTTP_STATUS_OK).json(updatedHousingList);
}

async function createHousingUpdateEvents(
  housingApi: HousingApi,
  housingUpdate: HousingUpdateBody,
  userId: string
): Promise<void> {
  const statusUpdate = housingUpdate.statusUpdate;
  if (
    statusUpdate &&
    (housingApi.status !== statusUpdate.status ||
      housingApi.subStatus !== statusUpdate.subStatus)
  ) {
    await eventRepository.insertManyHousingEvents([
      {
        id: uuidv4(),
        name: 'Changement de statut de suivi',
        type: 'housing:status-updated',
        nextOld: compactUndefined({
          status: toEventHousingStatus(housingApi.status),
          subStatus: housingApi.subStatus
        }),
        nextNew: compactUndefined({
          status: toEventHousingStatus(statusUpdate.status),
          subStatus: statusUpdate.subStatus
        }),
        createdAt: new Date().toJSON(),
        createdBy: userId,
        housingGeoCode: housingApi.geoCode,
        housingId: housingApi.id
      }
    ]);
  }

  const occupancyUpdate = housingUpdate.occupancyUpdate;
  if (
    occupancyUpdate &&
    ((housingApi.occupancy ?? '') !== (occupancyUpdate.occupancy ?? '') ||
      (housingApi.occupancyIntended ?? '') !==
        (occupancyUpdate.occupancyIntended ?? ''))
  ) {
    await eventRepository.insertManyHousingEvents([
      {
        id: uuidv4(),
        name: "Modification du statut d'occupation",
        type: 'housing:occupancy-updated',
        nextOld: compactUndefined({
          occupancy: housingApi.occupancy,
          occupancyIntended: housingApi.occupancyIntended ?? undefined
        }),
        nextNew: compactUndefined({
          occupancy: occupancyUpdate.occupancy,
          occupancyIntended: occupancyUpdate.occupancyIntended ?? undefined
        }),
        createdBy: userId,
        createdAt: new Date().toJSON(),
        housingId: housingApi.id,
        housingGeoCode: housingApi.geoCode
      }
    ]);
  }
}
async function createHousingUpdateNote(
  housingId: string,
  housingUpdate: HousingUpdateBody,
  userId: string,
  geoCode: string
) {
  if (housingUpdate.note) {
    await noteRepository.createByHousing({
      id: uuidv4(),
      ...housingUpdate.note,
      createdBy: userId,
      createdAt: new Date(),
      housingId,
      housingGeoCode: geoCode
    });
  }
}

const housingController = {
  getValidators,
  get,
  list,
  count,
  createValidators,
  create,
  updateValidators,
  updateNext,
  updateListValidators,
  updateList
};

export default housingController;
