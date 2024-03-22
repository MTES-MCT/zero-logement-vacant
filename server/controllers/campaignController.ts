import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import {
  CampaignApi,
  CampaignSortableApi,
  CampaignSteps,
} from '../models/CampaignApi';
import housingRepository from '../repositories/housingRepository';
import eventRepository from '../repositories/eventRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import { HousingApi } from '../models/HousingApi';
import async from 'async';
import housingFiltersApi, {
  HousingFiltersApi,
} from '../models/HousingFiltersApi';
import { logger } from '../utils/logger';
import groupRepository from '../repositories/groupRepository';
import GroupMissingError from '../errors/groupMissingError';
import {
  campaignFiltersValidators,
  CampaignQuery,
} from '../models/CampaignFiltersApi';
import { isArrayOf, isString, isUUID, isUUIDParam } from '../utils/validators';
import sortApi from '../models/SortApi';
import CampaignMissingError from '../errors/campaignMissingError';
import { HousingEventApi } from '../models/EventApi';
import { CampaignPayloadDTO } from '../../shared/models/CampaignDTO';
import { HousingFiltersDTO } from '../../shared/models/HousingFiltersDTO';

const getCampaignValidators = [param('id').notEmpty().isUUID()];

const getCampaign = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const campaignId = request.params.id;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  logger.info('Get campaign', { campaignId });

  const campaign = await campaignRepository.findOne({
    id: campaignId,
    establishmentId,
  });
  if (!campaign) {
    throw new CampaignMissingError(campaignId);
  }

  return response.status(constants.HTTP_STATUS_OK).json(campaign);
};

const listValidators: ValidationChain[] = [
  ...campaignFiltersValidators,
  ...sortApi.queryValidators,
];

async function list(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;
  const query = request.query as CampaignQuery;
  const sort = sortApi.parse<CampaignSortableApi>(
    request.query.sort as string[] | undefined
  );
  logger.info('List campaigns', query);

  const campaigns = await campaignRepository.find({
    filters: {
      establishmentId: auth.establishmentId,
      groupIds:
        typeof query.groups === 'string' ? [query.groups] : query.groups,
    },
    sort,
  });
  response.status(constants.HTTP_STATUS_OK).json(campaigns);
}

export interface CreateCampaignBody {
  draftCampaign: {
    filters: HousingFiltersApi;
    title: string;
  };
  allHousing: boolean;
  housingIds: string[];
}

const createValidators: ValidationChain[] = [
  body('title')
    .isString()
    .withMessage('Must be a string')
    .trim()
    .notEmpty()
    .withMessage('Required'),
  body('housing').isObject({ strict: true }),
  body('housing.all')
    .if(body('housing').notEmpty())
    .isBoolean({ strict: true })
    .withMessage('Must be a boolean')
    .notEmpty()
    .withMessage('Required'),
  body('housing.ids')
    .if(body('housing').notEmpty())
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUID'),
  ...housingFiltersApi.validators('housing.filters'),
];
async function create(request: Request, response: Response) {
  logger.info('Create campaign');

  const { auth } = request as AuthenticatedRequest;
  const body = request.body as CampaignPayloadDTO;

  const filters: HousingFiltersDTO = {
    ...body.housing.filters,
    establishmentIds: [auth.establishmentId],
  };
  const campaign: CampaignApi = {
    id: uuidv4(),
    title: body.title,
    status: 'draft',
    filters,
    createdAt: new Date().toJSON(),
    validatedAt: new Date().toJSON(),
    userId: auth.userId,
    establishmentId: auth.establishmentId,
  };

  const houses =
    body.housing.all !== undefined
      ? await housingRepository
          .find({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            filters,
            pagination: { paginate: false },
          })
          .then((houses) => {
            const ids = new Set(body.housing.ids);
            return houses.filter((housing) =>
              body.housing.all ? !ids.has(housing.id) : ids.has(housing.id)
            );
          })
      : [];

  await campaignRepository.save(campaign);
  await campaignHousingRepository.insertHousingList(campaign.id, houses);

  response.status(constants.HTTP_STATUS_CREATED).json(campaign);

  // TODO: transform this into CampaignHousingEventApi[]
  // extends EventApi<CampaignApi>
  const events: HousingEventApi[] = houses.map((housing) => ({
    id: uuidv4(),
    name: 'Ajout dans une campagne',
    kind: 'Create',
    category: 'Campaign',
    section: 'Suivi de campagne',
    old: housing,
    new: houses
      .map((housing) => ({ ...housing, campaignIds: [campaign.id] }))
      .find((_) => _.id === housing.id),
    createdBy: auth.userId,
    createdAt: new Date(),
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
  }));
  eventRepository
    .insertManyHousingEvents(events)
    .catch((error) =>
      logger.error('Error while inserting housing events', error)
    );
}

async function createCampaignFromGroup(request: Request, response: Response) {
  const { auth, body, params } = request as AuthenticatedRequest;
  const groupId = params.id;
  logger.info('Create campaign from group', { groupId });

  const group = await groupRepository.findOne({
    id: groupId,
    establishmentId: auth.establishmentId,
  });
  if (!group || !!group.archivedAt) {
    throw new GroupMissingError(groupId);
  }

  const campaign: CampaignApi = {
    id: uuidv4(),
    title: body.title,
    status: 'draft',
    filters: {
      groupIds: [group.id],
    },
    createdAt: new Date().toJSON(),
    groupId,
    userId: auth.userId,
    establishmentId: auth.establishmentId,
    validatedAt: new Date().toJSON(),
  };
  await campaignRepository.save(campaign);

  const housingList = await housingRepository.find({
    filters: {
      establishmentIds: [auth.establishmentId],
      groupIds: [group.id],
    },
    pagination: { paginate: false },
  });
  await campaignHousingRepository.insertHousingList(campaign.id, housingList);

  response.status(constants.HTTP_STATUS_CREATED).json(campaign);

  const events: HousingEventApi[] = housingList.map((housing) => ({
    id: uuidv4(),
    name: 'Ajout dans une campagne',
    kind: 'Create',
    category: 'Campaign',
    section: 'Suivi de campagne',
    old: housing,
    new: {
      ...housing,
      campaignIds: [...housing.campaignIds, campaign.id],
    },
    createdBy: auth.userId,
    createdAt: new Date(),
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
  }));
  eventRepository
    .insertManyHousingEvents(events)
    .catch((error) =>
      logger.error('Error while inserting housing events', error)
    );
}
const createCampaignFromGroupValidators: ValidationChain[] = [
  param('id').isUUID().notEmpty(),
  body('title').isString().notEmpty(),
];

type StepUpdate = { step: CampaignSteps } & Pick<CampaignApi, 'sendingDate'>;

export interface CampaignUpdateBody {
  titleUpdate?: Pick<CampaignApi, 'title'>;
  stepUpdate?: StepUpdate;
}

const updateCampaignValidators = [
  param('id').notEmpty().isUUID(),
  body('titleUpdate.title')
    .if(body('titleUpdate').notEmpty())
    .isString()
    .notEmpty(),
  body('stepUpdate.step')
    .if(body('stepUpdate').notEmpty())
    .notEmpty()
    .isIn([
      CampaignSteps.OwnersValidation,
      CampaignSteps.Export,
      CampaignSteps.Sending,
      CampaignSteps.Confirmation,
      CampaignSteps.InProgess,
      CampaignSteps.Archived,
    ]),
  body('stepUpdate.sendingDate')
    .if(body('stepUpdate.step').equals(String(CampaignSteps.Sending)))
    .notEmpty()
    .isString()
    .isISO8601(),
];
async function updateCampaign(
  request: Request,
  response: Response
): Promise<Response> {
  const campaignId = request.params.id;
  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;
  const campaignUpdate = request.body as CampaignUpdateBody;

  const campaignApi = await campaignRepository.findOne({
    id: campaignId,
    establishmentId,
  });

  if (!campaignApi) {
    throw new CampaignMissingError(campaignId);
  }

  if (campaignUpdate.titleUpdate?.title) {
    const updatedCampaign = await updateCampaignTitle(
      campaignApi,
      campaignUpdate.titleUpdate.title
    );
    return response.status(constants.HTTP_STATUS_OK).json(updatedCampaign);
  }
  if (campaignUpdate.stepUpdate?.step !== undefined) {
    const updatedCampaign = await updateCampaignStep(
      campaignApi,
      campaignUpdate.stepUpdate,
      userId
    );
    return response.status(constants.HTTP_STATUS_OK).json(updatedCampaign);
  }

  return response.status(constants.HTTP_STATUS_OK).json(campaignApi);
}

async function updateCampaignTitle(
  campaignApi: CampaignApi,
  title: string
): Promise<CampaignApi> {
  logger.info('Update campaign title', { campaignId: campaignApi.id, title });
  const updatedCampaign: CampaignApi = {
    ...campaignApi,
    title,
  };
  await campaignRepository.update(updatedCampaign);
  return updatedCampaign;
}

const updateCampaignStep = async (
  campaignApi: CampaignApi,
  stepUpdate: StepUpdate,
  userId: string
): Promise<CampaignApi> => {
  logger.info('Update campaign step', {
    campaignId: campaignApi.id,
    ...stepUpdate,
  });

  const step = stepUpdate.step;
  const updatedCampaign: CampaignApi = {
    ...campaignApi,
    validatedAt:
      step === CampaignSteps.OwnersValidation
        ? new Date().toJSON()
        : campaignApi.validatedAt,
    exportedAt:
      step === CampaignSteps.Export
        ? new Date().toJSON()
        : campaignApi.exportedAt,
    sentAt:
      step === CampaignSteps.Sending ? new Date().toJSON() : campaignApi.sentAt,
    sendingDate:
      step === CampaignSteps.Sending
        ? stepUpdate.sendingDate
        : campaignApi.sendingDate,
    confirmedAt:
      step === CampaignSteps.Confirmation
        ? new Date().toJSON()
        : campaignApi.confirmedAt,
    archivedAt:
      step === CampaignSteps.Archived
        ? new Date().toJSON()
        : campaignApi.archivedAt,
  };

  if (step === CampaignSteps.Sending) {
    const housingList = await housingRepository.find({
      filters: {
        establishmentIds: [campaignApi.establishmentId],
        campaignIds: [campaignApi.id],
      },
    });

    const updatedHousingList = housingList
      .filter((_) => !_.status)
      .map((housing) => ({
        ...housing,
        status: HousingStatusApi.Waiting,
      }));

    await async.map(updatedHousingList, async (updatedHousing: HousingApi) =>
      housingRepository.update(updatedHousing)
    );

    await eventRepository.insertManyHousingEvents(
      updatedHousingList.map((updatedHousing) => ({
        id: uuidv4(),
        name: 'Changement de statut de suivi',
        kind: 'Update',
        category: 'Campaign',
        section: 'Suivi de campagne',
        old: housingList.find((_) => _.id === updatedHousing.id),
        new: updatedHousing,
        createdBy: userId,
        createdAt: new Date(),
        housingId: updatedHousing.id,
        housingGeoCode: updatedHousing.geoCode,
      }))
    );
  }

  await eventRepository.insertCampaignEvent({
    id: uuidv4(),
    name: 'Modification du statut de la campagne',
    kind: 'Update',
    category: 'Campaign',
    section: 'Suivi de campagne',
    old: campaignApi,
    new: updatedCampaign,
    createdBy: userId,
    createdAt: new Date(),
    campaignId: campaignApi.id,
  });

  await campaignRepository.update(updatedCampaign);

  return updatedCampaign;
};

async function removeCampaign(
  request: Request,
  response: Response
): Promise<Response> {
  const campaignId = request.params.id;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  logger.info('Delete campaign', campaignId);

  const campaignApi = await campaignRepository.findOne({
    id: campaignId,
    establishmentId,
  });

  if (!campaignApi) {
    throw new CampaignMissingError(campaignId);
  }

  await Promise.all([
    campaignHousingRepository.deleteHousingFromCampaigns([campaignId]),
    eventRepository.removeCampaignEvents(campaignId),
  ]);

  await campaignRepository.remove(campaignId);

  await resetHousingWithoutCampaigns(establishmentId);

  return response.sendStatus(constants.HTTP_STATUS_NO_CONTENT);
}

async function resetHousingWithoutCampaigns(establishmentId: string) {
  return housingRepository
    .find({
      filters: {
        establishmentIds: [establishmentId],
        campaignsCounts: ['0'],
        statusList: [HousingStatusApi.Waiting],
      },
      pagination: { paginate: false },
    })
    .then((housingList) =>
      async.map(housingList, async (housing: HousingApi) =>
        housingRepository.update({
          ...housing,
          status: HousingStatusApi.NeverContacted,
          subStatus: undefined,
        })
      )
    );
}

const removeHousingValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('all').isBoolean().notEmpty(),
  body('ids').custom(isArrayOf(isString)),
  ...housingFiltersApi.validators('filters'),
];
async function removeHousing(
  request: Request,
  response: Response
): Promise<Response> {
  logger.info('Remove campaign housing list');

  const campaignId = request.params.id;
  const filters = <HousingFiltersApi>request.body.filters;
  const all = <boolean>request.body.all;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  const housingIds = await housingRepository
    .find({
      filters: {
        ...filters,
        establishmentIds: [establishmentId],
        campaignIds: [campaignId],
      },
      pagination: { paginate: false },
    })
    .then((_) =>
      _.map((_) => _.id).filter((id) =>
        all ? !request.body.ids.includes(id) : request.body.ids.includes(id)
      )
    );

  return campaignHousingRepository
    .deleteHousingFromCampaigns([campaignId], housingIds)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
}

const campaignController = {
  getCampaignValidators,
  getCampaign,
  listValidators,
  list,
  createValidators,
  create,
  createCampaignFromGroup,
  createCampaignFromGroupValidators,
  updateCampaignValidators,
  updateCampaign,
  removeCampaign,
  removeHousingValidators,
  removeHousing,
};

export default campaignController;
