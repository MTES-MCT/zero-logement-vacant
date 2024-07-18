import { Request, Response } from 'express';
import campaignRepository from '~/repositories/campaignRepository';
import campaignHousingRepository from '~/repositories/campaignHousingRepository';
import {
  CampaignApi,
  CampaignSortableApi,
  toCampaignDTO
} from '~/models/CampaignApi';
import housingRepository from '~/repositories/housingRepository';
import eventRepository from '~/repositories/eventRepository';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import { HousingApi } from '~/models/HousingApi';
import async from 'async';
import housingFiltersApi, {
  HousingFiltersApi
} from '~/models/HousingFiltersApi';
import { logger } from '~/infra/logger';
import groupRepository from '~/repositories/groupRepository';
import GroupMissingError from '~/errors/groupMissingError';
import {
  campaignFiltersValidators,
  CampaignQuery
} from '~/models/CampaignFiltersApi';
import { isArrayOf, isString, isUUID, isUUIDParam } from '~/utils/validators';
import sortApi from '~/models/SortApi';
import CampaignMissingError from '~/errors/campaignMissingError';
import { HousingEventApi } from '~/models/EventApi';
import {
  CAMPAIGN_STATUSES,
  CampaignCreationPayloadDTO,
  CampaignDTO,
  CampaignUpdatePayloadDTO,
  HousingFiltersDTO,
  nextStatus
} from '@zerologementvacant/models';
import CampaignStatusError from '~/errors/campaignStatusError';
import CampaignFileMissingError from '~/errors/CampaignFileMissingError';
import draftRepository from '~/repositories/draftRepository';
import DraftMissingError from '~/errors/draftMissingError';

const getCampaignValidators = [param('id').notEmpty().isUUID()];

async function getCampaign(request: Request, response: Response) {
  const campaignId = request.params.id;
  const { establishmentId, } = (request as AuthenticatedRequest).auth;

  logger.info('Get campaign', { campaignId, establishmentId, });

  const campaign = await campaignRepository.findOne({
    id: campaignId,
    establishmentId,
  });
  if (!campaign) {
    throw new CampaignMissingError(campaignId);
  }

  response.status(constants.HTTP_STATUS_OK).json(campaign);
}

async function downloadCampaign(request: Request, response: Response) {
  const campaignId = request.params.id;
  const { establishmentId, } = (request as AuthenticatedRequest).auth;

  logger.info('Download campaign', { campaignId, });

  const campaign = await campaignRepository.findOne({
    id: campaignId,
    establishmentId,
  });
  if (!campaign) {
    throw new CampaignMissingError(campaignId);
  }

  if (!campaign.file) {
    throw new CampaignFileMissingError(campaignId);
  }

  campaign.exportedAt = new Date().toISOString();
  await campaignRepository.update(campaign);

  response.redirect(campaign.file);
}

const listValidators: ValidationChain[] = [
  ...campaignFiltersValidators,
  ...sortApi.queryValidators
];

async function list(request: Request, response: Response) {
  const { auth, } = request as AuthenticatedRequest;
  const query = request.query as CampaignQuery;
  const sort = sortApi.parse<CampaignSortableApi>(
    request.query.sort as string[] | undefined
  );
  logger.info('List campaigns', query);

  const campaigns = await campaignRepository.find({
    filters: {
      establishmentId: auth.establishmentId,
      groupIds: typeof query.groups === 'string' ? [query.groups] : query.groups,
    },
    sort,
  });
  response.status(constants.HTTP_STATUS_OK).json(campaigns);
}

const createValidators: ValidationChain[] = [
  body('title')
    .isString()
    .withMessage('Must be a string')
    .trim()
    .notEmpty()
    .withMessage('Required'),
  body('housing').isObject({ strict: true, }),
  body('housing.all')
    .if(body('housing').notEmpty())
    .isBoolean({ strict: true, })
    .withMessage('Must be a boolean')
    .notEmpty()
    .withMessage('Required'),
  body('housing.ids')
    .if(body('housing').notEmpty())
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUID'),
  ...housingFiltersApi.validators('housing.filters')
];
async function create(request: Request, response: Response<CampaignDTO>) {
  logger.info('Create campaign');

  const { auth, } = request as AuthenticatedRequest;
  const body = request.body as CampaignCreationPayloadDTO;

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
            pagination: { paginate: false, },
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

  response.status(constants.HTTP_STATUS_CREATED).json(toCampaignDTO(campaign));

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
      .map((housing) => ({ ...housing, campaignIds: [campaign.id], }))
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
  const { auth, body, params, } = request as AuthenticatedRequest;
  const groupId = params.id;
  logger.info('Create campaign from group', { groupId, });

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
  };
  await campaignRepository.save(campaign);

  const housingList = await housingRepository.find({
    filters: {
      establishmentIds: [auth.establishmentId],
      groupIds: [group.id],
    },
    pagination: { paginate: false, },
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
  body('title').isString().notEmpty()
];

const updateValidators: ValidationChain[] = [
  param('id').notEmpty().isUUID(),
  body('title').isString().notEmpty(),
  body('status').isString().isIn(CAMPAIGN_STATUSES),
  body('sentAt')
    .if(body('status').equals('in-progress'))
    .isISO8601()
    .notEmpty(),
  body('file').optional({ nullable: true, }).isString()
];
async function update(request: Request, response: Response) {
  const { auth, params, } = request as AuthenticatedRequest;
  const body = request.body as CampaignUpdatePayloadDTO;

  const [campaign, drafts] = await Promise.all([
    campaignRepository.findOne({
      id: params.id,
      establishmentId: auth.establishmentId,
    }),
    draftRepository.find({
      filters: {
        campaign: params.id,
        establishment: auth.establishmentId,
      },
    })
  ]);
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  if (drafts.length === 0) {
    throw new DraftMissingError(params.id);
  }

  if (
    campaign.status !== body.status &&
    nextStatus(campaign.status) !== body.status
  ) {
    throw new CampaignStatusError({
      campaign,
      target: body.status,
    });
  }

  const updated: CampaignApi = {
    ...campaign,
    title: body.title,
    status: body.status,
    file: body.file,
    validatedAt:
      campaign.status !== body.status && body.status === 'sending'
        ? new Date().toJSON()
        : campaign.validatedAt,
    sentAt:
      campaign.status !== body.status && body.status === 'in-progress'
        ? body.sentAt
        : campaign.sentAt,
    confirmedAt:
      campaign.status !== body.status && body.status === 'in-progress'
        ? new Date().toJSON()
        : campaign.confirmedAt,
    archivedAt:
      campaign.status !== body.status && body.status === 'archived'
        ? new Date().toJSON()
        : campaign.archivedAt,
  };

  await campaignRepository.save(updated);
  logger.info('Campaign updated', updated);

  if (campaign.status !== body.status && body.status === 'sending') {
    await campaignRepository.generateMails(updated);
  }
  response.status(constants.HTTP_STATUS_OK).json(updated);

  if (campaign.status !== updated.status) {
    try {
      await eventRepository.insertCampaignEvent({
        id: uuidv4(),
        name: 'Modification du statut de la campagne',
        kind: 'Update',
        category: 'Campaign',
        section: 'Suivi de campagne',
        old: campaign,
        new: updated,
        createdBy: auth.userId,
        createdAt: new Date(),
        campaignId: campaign.id,
        conflict: false,
      });

      if (updated.status === 'in-progress') {
        const houses = await housingRepository.find({
          filters: {
            establishmentIds: [updated.establishmentId],
            campaignIds: [updated.id],
            status: HousingStatusApi.NeverContacted,
          },
        });
        const updatedHouses = houses.map((housing) => ({
          ...housing,
          status: HousingStatusApi.Waiting,
        }));
        await housingRepository.saveMany(updatedHouses, {
          onConflict: 'merge',
          merge: ['status'],
        });
        await eventRepository.insertManyHousingEvents(
          houses.map((housing) => ({
            id: uuidv4(),
            name: 'Changement de statut de suivi',
            kind: 'Update',
            category: 'Campaign',
            section: 'Suivi de campagne',
            old: housing,
            new: {
              ...housing,
              status: HousingStatusApi.Waiting,
            },
            createdBy: auth.userId,
            createdAt: new Date(),
            housingId: housing.id,
            housingGeoCode: housing.geoCode,
          }))
        );
      }
    } catch (error) {
      logger.error(error);
    }
  }
}

async function removeCampaign(
  request: Request,
  response: Response
): Promise<Response> {
  const campaignId = request.params.id;
  const { establishmentId, } = (request as AuthenticatedRequest).auth;

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
    eventRepository.removeCampaignEvents(campaignId)
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
      pagination: { paginate: false, },
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
  ...housingFiltersApi.validators('filters')
];
async function removeHousing(
  request: Request,
  response: Response
): Promise<Response> {
  logger.info('Remove campaign housing list');

  const campaignId = request.params.id;
  const filters = <HousingFiltersApi>request.body.filters;
  const all = <boolean>request.body.all;
  const { establishmentId, } = (request as AuthenticatedRequest).auth;

  const housingIds = await housingRepository
    .find({
      filters: {
        ...filters,
        establishmentIds: [establishmentId],
        campaignIds: [campaignId],
      },
      pagination: { paginate: false, },
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
  downloadCampaign,
  listValidators,
  list,
  create,
  createValidators,
  createCampaignFromGroup,
  createCampaignFromGroupValidators,
  update,
  updateValidators,
  removeCampaign,
  removeHousingValidators,
  removeHousing,
};

export default campaignController;
