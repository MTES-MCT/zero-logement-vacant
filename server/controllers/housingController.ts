import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import {
  HousingApi,
  HousingSortableApi,
  HousingUpdateApi,
  isHousingUpdated,
} from '../models/HousingApi';
import {
  HousingFiltersApi,
  HousingFiltersForTotalCountApi,
} from '../models/HousingFiltersApi';
import campaignRepository from '../repositories/campaignRepository';
import { UserRoles } from '../models/UserApi';
import eventRepository from '../repositories/eventRepository';
import { HousingEventApi } from '../models/EventApi';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { AuthenticatedRequest } from 'express-jwt';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { constants } from 'http2';
import { body, param, ValidationChain } from 'express-validator';
import validator from 'validator';
import SortApi from '../models/SortApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { isArrayOf, isInteger, isString, isUUID } from '../utils/validators';
import paginationApi, { PaginationApi } from '../models/PaginationApi';
import HousingMissingError from '../errors/housingMissingError';
import { v4 as uuidv4 } from 'uuid';
import noteRepository from '../repositories/noteRepository';
import { HousingNoteApi } from '../models/NoteApi';

const get = async (request: Request, response: Response) => {
  const id = request.params.id;
  const establishment = (request as AuthenticatedRequest).establishment;

  console.log('Get housing', id);

  const housing = await housingRepository.get(id, establishment.geoCodes);
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

const list = async (request: Request, response: Response) => {
  console.log('List housing');

  const { auth, user } = request as AuthenticatedRequest;
  // TODO: type the whole body
  const pagination = request.body as Required<PaginationApi>;
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

  const housing: PaginatedResultApi<HousingApi> = pagination.paginate
    ? await housingRepository.paginatedListWithFilters(
        {
          ...filters,
          establishmentIds,
        },
        {
          ...filtersForTotalCount,
          establishmentIds,
        },
        pagination.page,
        pagination.perPage,
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
  response.status(constants.HTTP_STATUS_OK).json(housing);
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
  const housingId = request.params.housingId;
  const { auth, establishment } = request as AuthenticatedRequest;
  const { userId, establishmentId } = auth;
  const housingUpdateApi = <HousingUpdateApi>request.body.housingUpdate;

  console.log('Update housing', housingId);

  const housing = await housingRepository.get(
    housingId,
    establishment.geoCodes
  );
  if (!housing) {
    throw new HousingMissingError(housingId);
  }

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

  if (isHousingUpdated(housing, housingUpdateApi)) {
    await createHousingUpdateEvent(
      [housing],
      housingUpdateApi,
      [lastCampaignId],
      userId
    );
  }

  if (housingUpdateApi.comment.length) {
    await createHousingUpdateNote([housing], housingUpdateApi, userId);
  }

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

  await createHousingUpdateEvent(
    housingList,
    housingUpdateApi,
    campaignIds,
    userId
  );

  await createHousingUpdateNote(housingList, housingUpdateApi, userId);

  return response.status(constants.HTTP_STATUS_OK).json(updatedHousingList);
};

const createHousingUpdateEvent = async (
  housingList: HousingApi[],
  housingUpdateApi: HousingUpdateApi,
  campaignIds: string[],
  userId: string
) => {
  return eventRepository.insertManyHousingEvents(
    housingList.map(
      (housingApi) =>
        <HousingEventApi>{
          id: uuidv4(),
          name: 'Modification du statut',
          kind: 'Update',
          category: 'Followup',
          section: 'Situation',
          contactKind: housingUpdateApi.contactKind,
          old: housingApi,
          new: {
            ...housingApi,
            status: housingUpdateApi.status,
            subStatus: housingUpdateApi.subStatus,
            precisions: housingUpdateApi.precisions,
            vacancyReasons: housingUpdateApi.vacancyReasons,
          },
          createdBy: userId,
          createdAt: new Date(),
          housingId: housingApi.id,
        }
    )
  );
};
const createHousingUpdateNote = async (
  housingList: HousingApi[],
  housingUpdateApi: HousingUpdateApi,
  userId: string
) => {
  return noteRepository.insertManyHousingNotes(
    housingList.map(
      (housingApi) =>
        <HousingNoteApi>{
          id: uuidv4(),
          title: 'Note sur la mise à jour du dossier',
          content: housingUpdateApi.comment,
          contactKind: housingUpdateApi.contactKind,
          createdBy: userId,
          createdAt: new Date(),
          housingId: housingApi.id,
        }
    )
  );
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
