import { Request, Response } from 'express';
import campaignRepository from '../repositories/campaignRepository';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import { CampaignApi, CampaignSortableApi, CampaignSteps } from '../models/CampaignApi';
import housingRepository from '../repositories/housingRepository';
import eventRepository from '../repositories/eventRepository';
import localityRepository from '../repositories/localityRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import { HousingApi } from '../models/HousingApi';
import async from 'async';
import housingFiltersApi, { HousingFiltersApi } from '../models/HousingFiltersApi';
import { logger } from '../utils/logger';
import groupRepository from '../repositories/groupRepository';
import GroupMissingError from '../errors/groupMissingError';
import { campaignFiltersValidators, CampaignQuery } from '../models/CampaignFiltersApi';
import { isArrayOf, isString, isUUID, isUUIDParam } from '../utils/validators';
import sortApi from '../models/SortApi';
import CampaignMissingError from '../errors/campaignMissingError';

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

const listCampaigns = async (request: Request, response: Response) => {
  const { auth } = request as AuthenticatedRequest;
  const query = request.query as CampaignQuery;
  const sort = sortApi.parse<CampaignSortableApi>(
    request.query.sort as string[] | undefined
  );
  logger.info('List campaigns', query);

  const campaigns = await campaignRepository.find({
    filters: {
      establishmentId: auth.establishmentId,
      groupIds: query.groups,
    },
    sort,
  });
  response.status(constants.HTTP_STATUS_OK).json(campaigns);
};

export interface CreateCampaignBody {
  draftCampaign: {
    filters: HousingFiltersApi;
    title: string;
  };
  allHousing: boolean;
  housingIds: string[];
}

const createCampaignValidators: ValidationChain[] = [
  ...housingFiltersApi.validators('draftCampaign.filters'),
  body('draftCampaign.title').isString().notEmpty(),
  body('allHousing').isBoolean().notEmpty(),
  body('housingIds').custom(isArrayOf(isUUID)),
];
const createCampaign = async (
  request: Request,
  response: Response
): Promise<Response> => {
  logger.info('Create campaign');

  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;

  const { draftCampaign, housingIds, allHousing } =
    request.body as CreateCampaignBody;

  const newCampaignApi = await campaignRepository.insert(<CampaignApi>{
    establishmentId,
    ...draftCampaign,
    createdBy: userId,
    validatedAt: new Date(),
  });

  const userLocalities = await localityRepository
    .listByEstablishmentId(establishmentId)
    .then((_) => _.map((_) => _.geoCode));

  const filterLocalities = (draftCampaign.filters.localities ?? []).length
    ? userLocalities.filter(
        (l) => (draftCampaign.filters.localities ?? []).indexOf(l) !== -1
      )
    : userLocalities;

  const housingList = allHousing
    ? await housingRepository
        .find({
          filters: {
            ...draftCampaign.filters,
            establishmentIds: [establishmentId],
            localities: filterLocalities,
          },
          pagination: { paginate: false },
        })
        .then((housingList) =>
          housingList.filter((housing) => !housingIds.includes(housing.id))
        )
    : await housingRepository.find({
        filters: {
          establishmentIds: [establishmentId],
          housingIds: request.body.housingIds,
        },
        pagination: {
          paginate: false,
        },
      });

  await campaignHousingRepository.insertHousingList(
    newCampaignApi.id,
    housingList
  );

  const newHousingList = await housingRepository.find({
    filters: {
      establishmentIds: [establishmentId],
      housingIds: housingList.map((_) => _.id),
    },
    pagination: {
      paginate: false,
    },
  });

  await eventRepository.insertManyHousingEvents(
    housingList.map((housing) => ({
      id: uuidv4(),
      name: 'Ajout dans une campagne',
      kind: 'Create',
      category: 'Campaign',
      section: 'Suivi de campagne',
      old: housingList.find((_) => _.id === housing.id),
      new: newHousingList
        .map((housing) => ({ ...housing, campaignIds: [newCampaignApi.id] }))
        .find((_) => _.id === housing.id),
      createdBy: userId,
      createdAt: new Date(),
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
    }))
  );

  return response.status(constants.HTTP_STATUS_OK).json(newCampaignApi);
};

const createCampaignFromGroup = async (
  request: Request,
  response: Response
): Promise<void> => {
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
    groupId,
    title: body.title,
    filters: {
      groupIds: [groupId],
    },
    createdAt: new Date(),
    createdBy: auth.userId,
    establishmentId: auth.establishmentId,
    validatedAt: new Date(),
  };
  await campaignRepository.insert(campaign);

  const housingList = await housingRepository.find({
    filters: {
      establishmentIds: [auth.establishmentId],
      groupIds: [group.id],
    },
    pagination: { paginate: false },
  });
  await campaignHousingRepository.insertHousingList(campaign.id, housingList);

  await eventRepository.insertManyHousingEvents(
    housingList.map((housing) => ({
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
    }))
  );

  response.status(constants.HTTP_STATUS_CREATED).json(campaign);
};
const createCampaignFromGroupValidators: ValidationChain[] = [
  param('id').isString().isUUID().notEmpty(),
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
const updateCampaign = async (
  request: Request,
  response: Response
): Promise<Response> => {
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
};

const updateCampaignTitle = async (
  campaignApi: CampaignApi,
  title: string
): Promise<CampaignApi> => {
  logger.info('Update campaign title', { campaignId: campaignApi.id, title });
  const updatedCampaign: CampaignApi = {
    ...campaignApi,
    title,
  };
  await campaignRepository.update(updatedCampaign);
  return updatedCampaign;
};

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
        ? new Date()
        : campaignApi.validatedAt,
    exportedAt:
      step === CampaignSteps.Export ? new Date() : campaignApi.exportedAt,
    sentAt: step === CampaignSteps.Sending ? new Date() : campaignApi.sentAt,
    sendingDate:
      step === CampaignSteps.Sending
        ? stepUpdate.sendingDate
        : campaignApi.sendingDate,
    confirmedAt:
      step === CampaignSteps.Confirmation
        ? new Date()
        : campaignApi.confirmedAt,
    archivedAt:
      step === CampaignSteps.Archived ? new Date() : campaignApi.archivedAt,
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

const removeCampaign = async (
  request: Request,
  response: Response
): Promise<Response> => {
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
};

const resetHousingWithoutCampaigns = async (establishmentId: string) => {
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
};

const removeHousingValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('all').isBoolean().notEmpty(),
  body('ids').custom(isArrayOf(isString)),
  ...housingFiltersApi.validators('filters'),
];
const removeHousing = async (
  request: Request,
  response: Response
): Promise<Response> => {
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
};

const campaignController = {
  getCampaignValidators,
  getCampaign,
  listValidators,
  listCampaigns,
  createCampaignValidators,
  createCampaign,
  createCampaignFromGroup,
  createCampaignFromGroupValidators,
  updateCampaignValidators,
  updateCampaign,
  removeCampaign,
  removeHousingValidators,
  removeHousing,
};

export default campaignController;
