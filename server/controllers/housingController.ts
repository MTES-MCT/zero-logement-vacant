import { NextFunction, Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import {
  HousingApi,
  HousingSortableApi,
  HousingUpdateApi,
} from '../models/HousingApi';
import {
  HousingFiltersApi,
  HousingFiltersForTotalCountApi,
} from '../models/HousingFiltersApi';
import campaignRepository from '../repositories/campaignRepository';
import { UserRoles } from '../models/UserApi';
import eventRepository from '../repositories/eventRepository';
import { EventApi, EventKinds } from '../models/EventApi';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { AuthenticatedRequest } from 'express-jwt';
import {
  getHousingStatusApiLabel,
  HousingStatusApi,
} from '../models/HousingStatusApi';
import { constants } from 'http2';
import {
  body,
  param,
  ValidationChain,
  validationResult,
} from 'express-validator';
import validator from 'validator';
import SortApi from '../models/SortApi';
import mailService from '../services/mailService';
import establishmentRepository from '../repositories/establishmentRepository';
import { CampaignApi } from '../models/CampaignApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { isArrayOf, isInteger, isString, isUUID } from '../utils/validators';
import paginationApi, { PaginationApi } from '../models/PaginationApi';

const get = async (request: Request, response: Response): Promise<Response> => {
  const id = request.params.id;

  console.log('Get housing', id);

  return housingRepository
    .get(id)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
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
  body('filtersForTotalCount').default({}).isObject({ strict: true }),
  body('filtersForTotalCount.establishmentIds')
    .default([])
    .custom(isArrayOf(isString)),
  body('filtersForTotalCount.dataYearsIncluded')
    .default([])
    .custom(isArrayOf(isInteger)),
  body('filtersForTotalCount.dataYearsExcluded')
    .default([])
    .custom(isArrayOf(isInteger)),
  body('filtersForTotalCount.status').default([]).custom(isArrayOf(isInteger)),
  body('filtersForTotalCount.campaignIds')
    .default([])
    .custom(isArrayOf(isString)),
  ...paginationApi.validators,
];

const list = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.log('List housing');

  const { auth, user } = request as AuthenticatedRequest;
  // TODO: type the whole body
  const { paginate, page, perPage } = request.body as Required<PaginationApi>;
  const filters = request.body.filters as HousingFiltersApi;
  const filtersForTotalCount = request.body
    .filtersForTotalCount as HousingFiltersForTotalCountApi;

  const role = user.role;
  const establishmentId = auth.establishmentId;
  const sort = SortApi.parse<HousingSortableApi>(
    request.query.sort as string | undefined
  );

  const establishmentIds =
    role === UserRoles.Admin && filters.establishmentIds?.length
      ? filters.establishmentIds
      : [establishmentId];

  try {
    const housing: PaginatedResultApi<HousingApi> = paginate
      ? await housingRepository.paginatedListWithFilters(
          {
            ...filters,
            establishmentIds,
          },
          {
            ...filtersForTotalCount,
            establishmentIds,
          },
          page,
          perPage,
          sort
        )
      : await housingRepository
          .listWithFilters({
            ...filters,
            establishmentIds,
          })
          .then((housing) => ({
            entities: housing,
            page: 1,
            perPage: housing.length,
            filteredCount: housing.length,
            // Wrong but not used
            totalCount: housing.length,
          }));
    return response.status(constants.HTTP_STATUS_OK).json(housing);
  } catch (err) {
    next(err);
  }
};

const count = async (request: Request, response: Response) => {
  console.log('Count housing');

  const { establishmentId, role } = (request as AuthenticatedRequest).auth;
  const filters = <HousingFiltersApi>request.body.filters ?? {};

  return housingRepository
    .countWithFilters({
      ...filters,
      establishmentIds:
        role === UserRoles.Admin && filters.establishmentIds?.length
          ? filters.establishmentIds
          : [establishmentId],
    })
    .then((count) => response.status(constants.HTTP_STATUS_OK).json({ count }));
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
    housingRepository.countWithFilters({ ownerIds: [ownerId] }),
  ]).then(([list, totalCount]) =>
    response
      .status(constants.HTTP_STATUS_OK)
      .json({ entities: list, totalCount })
  );
};

const updateHousingValidators = [
  param('housingId').isUUID(),
  body('housingUpdate').notEmpty(),
  body('housingUpdate.status').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('housingUpdate.contactKind').notEmpty(),
];

const updateHousing = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  const housingId = request.params.housingId;

  console.log('Update housing', housingId);

  const { userId, establishmentId } = (request as AuthenticatedRequest).auth;
  const housingUpdateApi = <HousingUpdateApi>request.body.housingUpdate;

  const housing = await housingRepository.get(housingId);

  const campaignList = await campaignRepository.listCampaigns(establishmentId);

  const lastCampaignId = housing.campaignIds.length
    ? campaignList
        .filter((_) => housing.campaignIds.indexOf(_.id) !== -1)
        .reverse()[0].id
    : campaignList.filter((_) => _.campaignNumber === 0)[0].id;

  if (!housing.campaignIds.length) {
    await campaignHousingRepository.insertHousingList(lastCampaignId, [
      housing.id,
    ]);
  }

  await createHousingUpdateEvent(
    [housing],
    housingUpdateApi,
    [lastCampaignId],
    userId
  );

  if (housingUpdateApi.status === HousingStatusApi.NeverContacted) {
    await campaignHousingRepository.deleteHousingFromCampaigns(
      [lastCampaignId],
      [housing.id]
    );
  }

  const updatedHousingList = await housingRepository.updateHousingList(
    [housing.id],
    housingUpdateApi.status,
    housingUpdateApi.subStatus,
    housingUpdateApi.precisions,
    housingUpdateApi.vacancyReasons
  );

  return response.status(constants.HTTP_STATUS_OK).json(updatedHousingList);
};

const updateHousingListValidators = [
  body('housingIds')
    .isArray()
    .custom((value) => value.every((v: any) => validator.isUUID(v))),
  body('campaignIds')
    .notEmpty()
    .isArray()
    .custom((value) => value.every((v: any) => validator.isUUID(v))),
  body('currentStatus').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('housingUpdate').notEmpty(),
  body('housingUpdate.status').notEmpty().isIn(Object.values(HousingStatusApi)),
  body('housingUpdate.contactKind').notEmpty(),
];

const updateHousingList = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response
      .status(constants.HTTP_STATUS_BAD_REQUEST)
      .json({ errors: errors.array() });
  }

  console.log('Update campaign housing list');

  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;
  const housingUpdateApi = <HousingUpdateApi>request.body.housingUpdate;
  const reqCampaignIds = request.body.campaignIds;
  const allHousing = <boolean>request.body.allHousing;
  const housingIds = request.body.housingIds;
  const currentStatus = request.body.currentStatus;
  const query = request.body.query;

  const campaignIds = await campaignRepository
    .listCampaigns(establishmentId)
    .then((_) =>
      _.map((_) => _.id).filter((_) => reqCampaignIds.indexOf(_) !== -1)
    );

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
          ? housingIds.indexOf(housing.id) === -1
          : housingIds.indexOf(housing.id) !== -1
      )
    );

  await createHousingUpdateEvent(
    housingList,
    housingUpdateApi,
    campaignIds,
    userId
  );

  if (housingUpdateApi.status === HousingStatusApi.NeverContacted) {
    await campaignHousingRepository.deleteHousingFromCampaigns(
      campaignIds,
      housingList.map((_) => _.id)
    );
  }

  const updatedHousingList = await housingRepository.updateHousingList(
    housingList.map((_) => _.id),
    housingUpdateApi.status,
    housingUpdateApi.subStatus,
    housingUpdateApi.precisions,
    housingUpdateApi.vacancyReasons
  );

  return response.status(constants.HTTP_STATUS_OK).json(updatedHousingList);
};

const createHousingUpdateEvent = async (
  housingList: HousingApi[],
  housingUpdateApi: HousingUpdateApi,
  campaignIds: string[],
  userId: string
) => {
  return eventRepository.insertList(
    housingList.map(
      (housing) =>
        <EventApi>{
          housingId: housing.id,
          ownerId: housing.owner.id,
          kind: EventKinds.StatusChange,
          campaignId: campaignIds
            .filter((_) => housing.campaignIds.indexOf(_) !== -1)
            .reverse()[0],
          contactKind: housingUpdateApi.contactKind,
          content: [
            getStatusLabel(housing, housingUpdateApi),
            housingUpdateApi.comment,
          ]
            .filter((_) => _ !== null && _ !== undefined)
            .join('. '),
          createdBy: userId,
        }
    )
  );
};

const getStatusLabel = (
  housingApi: HousingApi,
  housingUpdateApi: HousingUpdateApi
) => {
  return housingApi.status !== housingUpdateApi.status ||
    housingApi.subStatus != housingUpdateApi.subStatus ||
    housingApi.precisions != housingUpdateApi.precisions
    ? [
        'Passage à ' + getHousingStatusApiLabel(housingUpdateApi.status),
        housingUpdateApi.subStatus,
        housingUpdateApi.precisions?.join(', '),
      ]
        .filter((_) => _?.length)
        .join(' - ')
    : undefined;
};

const housingController = {
  get,
  listValidators,
  list,
  count,
  listByOwner,
  updateHousingValidators,
  updateHousing,
  updateHousingListValidators,
  updateHousingList,
};

export default housingController;
