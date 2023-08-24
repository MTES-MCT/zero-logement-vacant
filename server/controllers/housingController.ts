import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import {
  hasCampaigns,
  HousingApi,
  HousingSortableApi,
  OccupancyKindApi,
} from '../models/HousingApi';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import campaignRepository from '../repositories/campaignRepository';
import { UserRoles } from '../models/UserApi';
import eventRepository from '../repositories/eventRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { AuthenticatedRequest } from 'express-jwt';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { constants } from 'http2';
import { body, ValidationChain } from 'express-validator';
import validator from 'validator';
import SortApi from '../models/SortApi';
import { HousingPaginatedResultApi } from '../models/PaginatedResultApi';
import { isArrayOf, isInteger, isString, isUUID } from '../utils/validators';
import paginationApi from '../models/PaginationApi';
import HousingMissingError from '../errors/housingMissingError';
import { v4 as uuidv4 } from 'uuid';
import noteRepository from '../repositories/noteRepository';
import { NoteApi } from '../models/NoteApi';
import _ from 'lodash';
import { logger } from '../utils/logger';
import fp from 'lodash/fp';
import { Pagination } from '../../shared/models/Pagination';
import isIn = validator.isIn;
import isEmpty = validator.isEmpty;
import sortApi from "../models/SortApi";

const get = async (request: Request, response: Response) => {
  const id = request.params.id;
  const establishment = (request as AuthenticatedRequest).establishment;

  console.log('Get housing', id);

  const housing = await housingRepository.get(id, establishment.id);
  if (!housing) {
    throw new HousingMissingError(id);
  }

  response.status(constants.HTTP_STATUS_OK).json(housing);
};

const listValidators: ValidationChain[] = [
  body('filters').isObject({ strict: true }),
  body('filters.establishmentIds')
    .default([])
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs'),
  body('filters.ownerKinds').default([]).custom(isArrayOf(isString)),
  body('filters.ownerAges').default([]).custom(isArrayOf(isString)),
  body('filters.multiOwners').default([]).custom(isArrayOf(isString)),
  body('filters.beneficiaryCounts').default([]).custom(isArrayOf(isString)),
  body('filters.housingKinds').default([]).custom(isArrayOf(isString)),
  body('filters.cadastralClassificiations')
    .default([])
    .custom(isArrayOf(isString)),
  body('filters.housingAreas').default([]).custom(isArrayOf(isString)),
  body('filters.roomsCounts').default([]).custom(isArrayOf(isString)),
  body('filters.buildingPeriods').default([]).custom(isArrayOf(isString)),
  body('filters.vacancyDurations').default([]).custom(isArrayOf(isString)),
  body('filters.isTaxedValues').default([]).custom(isArrayOf(isString)),
  body('filters.ownershipKinds').default([]).custom(isArrayOf(isString)),
  body('filters.housingCounts').default([]).custom(isArrayOf(isString)),
  body('filters.vacancyRates').default([]).custom(isArrayOf(isString)),
  body('filters.campaignsCounts').default([]).custom(isArrayOf(isString)),
  body('filters.campaignIds').default([]).custom(isArrayOf(isString)),
  body('filters.ownerIds').default([]).custom(isArrayOf(isString)),
  body('filters.localities').default([]).custom(isArrayOf(isString)),
  body('filters.localityKinds').default([]).custom(isArrayOf(isString)),
  body('filters.geoPerimetersIncluded').default([]).custom(isArrayOf(isString)),
  body('filters.geoPerimetersExcluded').default([]).custom(isArrayOf(isString)),
  body('filters.dataYearsIncluded').default([]).custom(isArrayOf(isInteger)),
  body('filters.dataYearsExcluded').default([]).custom(isArrayOf(isInteger)),
  body('filters.status').default([]).custom(isArrayOf(isInteger)),
  body('filters.subStatus').default([]).custom(isArrayOf(isString)),
  body('filters.query').default('').isString(),
  body('filters.energyConsumption').default([]).custom(isArrayOf(isString)),
  body('filters.energyConsumptionWorst')
    .default([])
    .custom(isArrayOf(isString)),
  body('filters.occupancies').default([]).custom(isArrayOf(isString)),
  ...sortApi.queryValidators,
  ...paginationApi.validators,
];

const list = async (
  request: Request,
  response: Response<HousingPaginatedResultApi>
) => {
  const { auth, body, user } = request as AuthenticatedRequest;
  // TODO: type the whole body
  const pagination: Required<Pagination> = fp.pick(
    ['paginate', 'perPage', 'page'],
    body
  );

  const role = user.role;
  const sort = SortApi.parse<HousingSortableApi>(
    request.query.sort as string | undefined
  );
  const filters: HousingFiltersApi = {
    ...body.filters,
    establishmentIds:
      role === UserRoles.Admin && body.filters.establishmentIds?.length
        ? body.filters.establishmentIds
        : [auth.establishmentId],
  };

  logger.trace('List housing', {
    pagination,
    filters,
    sort,
  });

  const [housing, count] = await Promise.all([
    housingRepository.find({
      filters,
      pagination,
      sort,
    }),
    housingRepository.count(filters),
  ]);

  const offset = (pagination.page - 1) * pagination.perPage;
  response
    .status(constants.HTTP_STATUS_OK)
    .setHeader(
      'Content-Range',
      `housing ${offset}-${offset + housing.length - 1}/${count.housing}`
    )
    .json({
      entities: housing,
      filteredCount: count.housing,
      filteredOwnerCount: count.owners,
      page: pagination.page,
      perPage: pagination.perPage,
      totalCount: 0,
    });
};

const count = async (request: Request, response: Response): Promise<void> => {
  console.log('Count housing');

  const { establishmentId, role } = (request as AuthenticatedRequest).auth;
  const filters = <HousingFiltersApi>request.body.filters ?? {};

  const count = await housingRepository.count({
    ...filters,
    establishmentIds:
      role === UserRoles.Admin && filters.establishmentIds?.length
        ? filters.establishmentIds
        : [establishmentId],
  });
  response.status(constants.HTTP_STATUS_OK).json(count);
};

const listByOwner = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const ownerId = request.params.ownerId;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  console.log('List housing by owner', ownerId);

  return Promise.all([
    housingRepository.listWithFilters({
      establishmentIds: [establishmentId],
      ownerIds: [ownerId],
    }),
    housingRepository.count({ ownerIds: [ownerId] }),
  ]).then(([list, totalCount]) =>
    response
      .status(constants.HTTP_STATUS_OK)
      .json({ entities: list, totalCount })
  );
};

export interface HousingUpdateBody {
  statusUpdate?: Pick<
    HousingApi,
    'status' | 'subStatus' | 'precisions' | 'vacancyReasons'
  >;
  occupancyUpdate?: Pick<HousingApi, 'occupancy' | 'occupancyIntended'>;
  note?: Pick<NoteApi, 'content' | 'noteKind'>;
}

const updateValidators = [
  body('housingUpdate').notEmpty(),
  body('housingUpdate.statusUpdate')
    .optional()
    .custom((value) =>
      isIn(String(value.status), Object.values(HousingStatusApi))
    ),
  body('housingUpdate.occupancyUpdate')
    .optional()
    .custom((value) =>
      isIn(String(value.occupancy), Object.values(OccupancyKindApi))
    )
    .custom(
      (value) =>
        !value.occupancyIntended ||
        isIn(String(value.occupancyIntended), Object.values(OccupancyKindApi))
    ),
  body('housingUpdate.note')
    .optional()
    .custom((value) => value.content && !isEmpty(value.content)),
];

const update = async (request: Request, response: Response) => {
  const housingId = request.params.housingId;
  const housingUpdateApi = request.body.housingUpdate as HousingUpdateBody;

  const updatedHousing = await updateHousing(
    housingId,
    housingUpdateApi,
    request as AuthenticatedRequest
  );

  response.status(constants.HTTP_STATUS_OK).json(updatedHousing);
};

const updateHousing = async (
  housingId: string,
  housingUpdate: HousingUpdateBody,
  authUser: Pick<AuthenticatedRequest, 'user' | 'establishment'>
): Promise<HousingApi> => {
  logger.trace('Update housing', {
    id: housingId,
    update: housingUpdate,
  });

  const { establishment, user } = authUser;

  const housing = await housingRepository.get(housingId, establishment.id);
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

  if (
    housingUpdate.statusUpdate?.status !== HousingStatusApi.NeverContacted &&
    !hasCampaigns(housing)
  ) {
    await addHousingInDefaultCampaign(housing, establishment.id);
  }

  if (
    housingUpdate.statusUpdate?.status === HousingStatusApi.NeverContacted &&
    hasCampaigns(housing)
  ) {
    await campaignHousingRepository.deleteHousingFromCampaigns(
      housing.campaignIds,
      [housing.id]
    );
  }

  const updatedHousing: HousingApi = {
    ...housing,
    ...(housingUpdate.occupancyUpdate
      ? {
          occupancy: housingUpdate.occupancyUpdate.occupancy,
          occupancyIntended: housingUpdate.occupancyUpdate.occupancyIntended,
        }
      : {}),
    ...(housingUpdate.statusUpdate
      ? {
          status: housingUpdate.statusUpdate.status,
          subStatus: housingUpdate.statusUpdate.subStatus,
          vacancyReasons: housingUpdate.statusUpdate.vacancyReasons,
          precisions: housingUpdate.statusUpdate.precisions,
        }
      : {}),
  };

  await housingRepository.update(updatedHousing);

  await createHousingUpdateEvents(housing, housingUpdate, user.id);

  await createHousingUpdateNote(housing.id, housingUpdate, user.id);

  return updatedHousing;
};

const addHousingInDefaultCampaign = async (
  housingApi: HousingApi,
  establishmentId: string
) => {
  const establishmentCampaigns = await campaignRepository.listCampaigns(
    establishmentId
  );
  const defaultCampaign = establishmentCampaigns.find(
    (_) => _.campaignNumber === 0
  );
  if (defaultCampaign) {
    await campaignHousingRepository.insertHousingList(defaultCampaign.id, [
      housingApi.id,
    ]);
  }
};

const updateListValidators = [
  body('allHousing').isBoolean(),
  body('housingIds').custom(isArrayOf(isUUID)),
  body('campaignIds').notEmpty().custom(isArrayOf(isUUID)),
  body('currentStatus').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('query').optional().isString().isAlphanumeric('fr-FR'),
  ...updateValidators,
];

const updateList = async (request: Request, response: Response) => {
  console.log('Update housing list');

  const { establishmentId } = (request as AuthenticatedRequest).auth;
  const housingUpdateApi = <HousingUpdateBody>request.body.housingUpdate;
  const reqCampaignIds = request.body.campaignIds;
  const allHousing = <boolean>request.body.allHousing;
  const housingIds = request.body.housingIds;
  const currentStatus = request.body.currentStatus;
  const query = request.body.query;

  const campaignIds = await campaignRepository
    .listCampaigns(establishmentId)
    .then((_) => _.map((_) => _.id).filter((_) => reqCampaignIds.includes(_)));

  const housingList = await housingRepository
    .listWithFilters({
      establishmentIds: [establishmentId],
      campaignIds,
      status: [currentStatus],
      query,
    })
    .then((_) =>
      _.filter((housing) =>
        allHousing
          ? !housingIds.includes(housing.id)
          : housingIds.includes(housing.id)
      )
    );

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
};

const createHousingUpdateEvents = async (
  housingApi: HousingApi,
  housingUpdate: HousingUpdateBody,
  userId: string
): Promise<void> => {
  const statusUpdate = housingUpdate.statusUpdate;
  if (
    statusUpdate &&
    (housingApi.status !== statusUpdate.status ||
      housingApi.subStatus !== statusUpdate.subStatus ||
      !_.isEqual(housingApi.precisions, statusUpdate.precisions) ||
      !_.isEqual(housingApi.vacancyReasons, statusUpdate.vacancyReasons))
  ) {
    await eventRepository.insertHousingEvent({
      id: uuidv4(),
      name: 'Changement de statut de suivi',
      kind: 'Update',
      category: 'Followup',
      section: 'Situation',
      old: housingApi,
      new: {
        ...housingApi,
        ...housingUpdate.statusUpdate,
      },
      createdBy: userId,
      createdAt: new Date(),
      housingId: housingApi.id,
    });
  }

  const occupancyUpdate = housingUpdate.occupancyUpdate;
  if (
    occupancyUpdate &&
    (housingApi.occupancy !== occupancyUpdate.occupancy ||
      housingApi.occupancyIntended !== occupancyUpdate.occupancyIntended)
  ) {
    await eventRepository.insertHousingEvent({
      id: uuidv4(),
      name: "Modification du statut d'occupation",
      kind: 'Update',
      category: 'Followup',
      section: 'Situation',
      old: housingApi,
      new: {
        ...housingApi,
        ...housingUpdate.occupancyUpdate,
      },
      createdBy: userId,
      createdAt: new Date(),
      housingId: housingApi.id,
    });
  }
};
const createHousingUpdateNote = async (
  housingId: string,
  housingUpdate: HousingUpdateBody,
  userId: string
) => {
  if (housingUpdate.note) {
    await noteRepository.insertHousingNote({
      id: uuidv4(),
      ...housingUpdate.note,
      createdBy: userId,
      createdAt: new Date(),
      housingId,
    });
  }
};

const housingController = {
  get,
  listValidators,
  list,
  count,
  listByOwner,
  updateValidators,
  update,
  updateListValidators,
  updateList,
};

export default housingController;
