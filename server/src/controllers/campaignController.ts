import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_VALUES,
  CampaignCreationPayloadDTO,
  CampaignDTO,
  CampaignRemovalPayloadDTO,
  CampaignUpdatePayloadDTO,
  HOUSING_STATUS_LABELS,
  HousingFiltersDTO,
  HousingStatus,
  nextStatus
} from '@zerologementvacant/models';
import { slugify, timestamp } from '@zerologementvacant/utils';
import { createS3 } from '@zerologementvacant/utils/node';
import { Request, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';

import CampaignEmptyError from '~/errors/campaignEmptyError';
import CampaignFileMissingError from '~/errors/CampaignFileMissingError';
import CampaignMissingError from '~/errors/campaignMissingError';
import CampaignStatusError from '~/errors/campaignStatusError';
import GroupMissingError from '~/errors/groupMissingError';
import config from '~/infra/config';
import { startTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import {
  CampaignApi,
  CampaignSortableApi,
  toCampaignDTO
} from '~/models/CampaignApi';
import {
  campaignFiltersValidators,
  CampaignQuery
} from '~/models/CampaignFiltersApi';
import {
  CampaignEventApi,
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import { HousingApi, shouldReset } from '~/models/HousingApi';
import housingFiltersApi from '~/models/HousingFiltersApi';
import sortApi from '~/models/SortApi';
import campaignHousingRepository from '~/repositories/campaignHousingRepository';
import campaignRepository from '~/repositories/campaignRepository';
import eventRepository from '~/repositories/eventRepository';
import groupRepository from '~/repositories/groupRepository';
import housingRepository from '~/repositories/housingRepository';
import mailService from '~/services/mailService';
import { isArrayOf, isString, isUUID, isUUIDParam } from '~/utils/validators';

const getCampaignValidators = [param('id').notEmpty().isUUID()];

async function getCampaign(request: Request, response: Response) {
  const campaignId = request.params.id;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  logger.info('Get campaign', { campaignId, establishmentId });

  const campaign = await campaignRepository.findOne({
    id: campaignId,
    establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(campaignId);
  }

  response.status(constants.HTTP_STATUS_OK).json(campaign);
}

async function downloadCampaign(request: Request, response: Response) {
  const campaignId = request.params.id;
  const { establishmentId } = (request as AuthenticatedRequest).auth;

  logger.info('Download campaign', { campaignId });

  const campaign = await campaignRepository.findOne({
    id: campaignId,
    establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(campaignId);
  }

  if (!campaign.file) {
    throw new CampaignFileMissingError(campaignId);
  }

  campaign.exportedAt = new Date().toISOString();
  await campaignRepository.update(campaign);

  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: campaign.file
  });

  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 60 * 60 // TTL: 1 hour
  });

  logger.debug(`Generated signed URL: ${signedUrl}`);

  response.redirect(signedUrl);
}

const listValidators: ValidationChain[] = [
  ...campaignFiltersValidators,
  ...sortApi.queryValidators
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
      groupIds: typeof query.groups === 'string' ? [query.groups] : query.groups
    },
    sort
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
  body('description').optional({ nullable: true }).isString(),
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
  ...housingFiltersApi.validators('housing.filters')
];
const create: RequestHandler<
  never,
  CampaignDTO,
  CampaignCreationPayloadDTO,
  never
> = async (request, response): Promise<void> => {
  const { auth, body, user } = request as AuthenticatedRequest<
    never,
    CampaignDTO,
    CampaignCreationPayloadDTO,
    never
  >;

  logger.info('Create campaign', { body });

  const filters: HousingFiltersDTO = {
    ...body.housing.filters,
    establishmentIds: [auth.establishmentId]
  };
  const campaign: CampaignApi = {
    id: uuidv4(),
    title: body.title,
    description: body.description,
    status: 'draft',
    filters,
    createdAt: new Date().toJSON(),
    userId: auth.userId,
    establishmentId: auth.establishmentId
  };

  const houses =
    body.housing.all !== undefined
      ? await housingRepository
          .find({
            filters,
            pagination: { paginate: false }
          })
          .then((houses) => {
            const ids = new Set(body.housing.ids);
            return houses.filter((housing) =>
              body.housing.all ? !ids.has(housing.id) : ids.has(housing.id)
            );
          })
      : [];

  if (houses.length === 0) {
    throw new CampaignEmptyError(filters);
  }

  const events: ReadonlyArray<CampaignHousingEventApi> =
    houses.map<CampaignHousingEventApi>((housing) => ({
      id: uuidv4(),
      name: 'Ajout dans une campagne',
      type: 'housing:campaign-attached',
      nextOld: null,
      nextNew: {
        name: campaign.title
      },
      createdBy: auth.userId,
      createdAt: new Date().toJSON(),
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      campaignId: campaign.id
    }));

  await startTransaction(async () => {
    await campaignRepository.save(campaign);
    await campaignHousingRepository.insertHousingList(campaign.id, houses);
    await eventRepository.insertManyCampaignHousingEvents(events);
  });
  response.status(constants.HTTP_STATUS_CREATED).json(toCampaignDTO(campaign));
  mailService.emit('user:created', user.email, {
    createdAt: new Date()
  });
};

async function createCampaignFromGroup(request: Request, response: Response) {
  const { auth, body, params } = request as AuthenticatedRequest;
  const groupId = params.id;
  logger.info('Create campaign from group', { groupId });

  const group = await groupRepository.findOne({
    id: groupId,
    establishmentId: auth.establishmentId
  });
  if (!group || !!group.archivedAt) {
    throw new GroupMissingError(groupId);
  }

  const campaign: CampaignApi = {
    id: uuidv4(),
    title: body.title,
    description: body.description,
    status: 'draft',
    filters: {
      groupIds: [group.id]
    },
    createdAt: new Date().toJSON(),
    groupId,
    userId: auth.userId,
    establishmentId: auth.establishmentId
  };

  await startTransaction(async () => {
    await campaignRepository.save(campaign);

    const housings = await housingRepository.find({
      filters: {
        establishmentIds: [auth.establishmentId],
        groupIds: [group.id]
      },
      pagination: {
        paginate: false
      }
    });
    const events = housings.map<CampaignHousingEventApi>((housing) => ({
      id: uuidv4(),
      name: 'Ajout dans une campagne',
      type: 'housing:campaign-attached',
      nextOld: null,
      nextNew: {
        name: campaign.title
      },
      createdBy: auth.userId,
      createdAt: new Date().toJSON(),
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      campaignId: campaign.id
    }));
    await Promise.all([
      campaignHousingRepository.insertHousingList(campaign.id, housings),
      eventRepository.insertManyCampaignHousingEvents(events)
    ]);
  });

  response.status(constants.HTTP_STATUS_CREATED).json(toCampaignDTO(campaign));
}
const createCampaignFromGroupValidators: ValidationChain[] = [
  param('id').isUUID().notEmpty(),
  body('title').isString().notEmpty(),
  body('description').optional({ nullable: true }).isString()
];

const updateValidators: ValidationChain[] = [
  param('id').notEmpty().isUUID(),
  body('title').isString().notEmpty(),
  body('description').optional({ nullable: true }).isString(),
  body('status').isString().isIn(CAMPAIGN_STATUS_VALUES),
  body('sentAt')
    .if(body('status').equals('in-progress'))
    .isISO8601()
    .notEmpty(),
  body('file').optional({ nullable: true }).isString()
];
async function update(request: Request, response: Response) {
  const { auth, params } = request as AuthenticatedRequest;
  const body = request.body as CampaignUpdatePayloadDTO;

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  if (
    campaign.status !== body.status &&
    nextStatus(campaign.status) !== body.status
  ) {
    throw new CampaignStatusError({
      campaign,
      target: body.status
    });
  }

  const name = timestamp().concat('-', slugify(body.title));
  const key = `${name}.zip`;

  if (key !== campaign.file && campaign.file !== null) {
    const s3 = createS3({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    });

    const copyCommand = new CopyObjectCommand({
      Bucket: config.s3.bucket,
      CopySource: `${config.s3.bucket}/${campaign.file}`,
      Key: key,
      ContentLanguage: 'fr',
      ContentType: 'application/x-zip',
      ACL: 'authenticated-read'
    });

    await s3.send(copyCommand);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: campaign.file
    });

    await s3.send(deleteCommand);
  }

  const updated: CampaignApi = {
    ...campaign,
    title: body.title,
    description: body.description,
    status: body.status,
    file: campaign.file !== null ? key : body.file,
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
        : campaign.archivedAt
  };

  await startTransaction(async () => {
    await campaignRepository.save(updated);
    logger.info('Campaign updated', updated);

    if (campaign.status !== body.status && body.status === 'sending') {
      await campaignRepository.generateMails(updated);
    }

    if (campaign.status !== updated.status) {
      const campaignEvent: CampaignEventApi = {
        id: uuidv4(),
        name: 'Modification de la campagne',
        type: 'campaign:updated',
        nextOld: {
          status: CAMPAIGN_STATUS_LABELS[campaign.status],
          title: campaign.title,
          description: campaign.description
        },
        nextNew: {
          status: CAMPAIGN_STATUS_LABELS[updated.status],
          title: updated.title,
          description: updated.description
        },
        createdAt: new Date().toJSON(),
        createdBy: auth.userId,
        campaignId: campaign.id
      };
      await eventRepository.insertManyCampaignEvents([campaignEvent]);

      if (updated.status === 'in-progress') {
        const housings = await housingRepository.find({
          filters: {
            establishmentIds: [updated.establishmentId],
            campaignIds: [updated.id],
            status: HousingStatus.NEVER_CONTACTED
          },
          pagination: {
            paginate: false
          }
        });
        const updatedHouses = housings.map((housing) => ({
          ...housing,
          status: HousingStatus.WAITING,
          subStatus: null
        }));
        await Promise.all([
          housingRepository.saveMany(updatedHouses, {
            onConflict: 'merge',
            merge: ['status']
          }),
          eventRepository.insertManyHousingEvents(
            housings.map((housing) => ({
              id: uuidv4(),
              name: 'Changement de statut de suivi',
              type: 'housing:status-updated',
              nextOld: {
                status: HOUSING_STATUS_LABELS[housing.status],
                subStatus: housing.subStatus
              },
              nextNew: {
                status: HOUSING_STATUS_LABELS[HousingStatus.WAITING],
                subStatus: null
              },
              createdBy: auth.userId,
              createdAt: new Date().toJSON(),
              housingId: housing.id,
              housingGeoCode: housing.geoCode
            }))
          )
        ]);
      }
    }
  });
  response.status(constants.HTTP_STATUS_OK).json(toCampaignDTO(updated));
}

const removeCampaign: RequestHandler<{ id: string }> = async (
  request,
  response
): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest<
    { id: string },
    never,
    never,
    never
  >;

  logger.info('Remove campaign', params.id);

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  const housings = await housingRepository.find({
    filters: {
      establishmentIds: [auth.establishmentId],
      campaignIds: [campaign.id]
    },
    pagination: {
      paginate: false
    }
  });
  const campaignHousingEvents = housings.map<CampaignHousingEventApi>(
    (housing) => ({
      id: uuidv4(),
      type: 'housing:campaign-removed',
      name: 'Retrait d’une campagne',
      nextOld: { name: campaign.title },
      nextNew: null,
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      campaignId: null,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    })
  );

  const updated = housings.filter(shouldReset).map<HousingApi>((housing) => ({
    ...housing,
    status: HousingStatus.NEVER_CONTACTED,
    subStatus: null
  }));
  const housingEvents = housings
    .filter(shouldReset)
    .map<HousingEventApi>((housing) => ({
      id: uuidv4(),
      type: 'housing:status-updated',
      name: 'Changement de statut de suivi',
      nextOld: {
        status: 'waiting',
        subStatus: housing.subStatus
      },
      nextNew: {
        status: 'never-contacted',
        subStatus: null
      },
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    }));

  await startTransaction(async () => {
    await Promise.all([
      campaignRepository.remove(params.id),
      housingRepository.saveMany(updated, {
        onConflict: 'merge',
        merge: ['status', 'sub_status']
      }),
      eventRepository.insertManyCampaignHousingEvents(campaignHousingEvents),
      eventRepository.insertManyHousingEvents(housingEvents)
    ]);
  });

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const removeHousingValidators: ValidationChain[] = [
  isUUIDParam('id'),
  body('all').isBoolean().notEmpty(),
  body('ids').custom(isArrayOf(isString)),
  ...housingFiltersApi.validators('filters')
];
async function removeHousing(
  request: Request,
  response: Response
): Promise<void> {
  logger.info('Remove campaign housing list');

  const { auth, body, params } = request as AuthenticatedRequest<
    { id: string },
    never,
    CampaignRemovalPayloadDTO,
    never
  >;

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  const housings = await housingRepository
    .find({
      filters: {
        ...body.filters,
        establishmentIds: [auth.establishmentId],
        campaignIds: [params.id]
      },
      pagination: { paginate: false }
    })
    .then((housings) => {
      const ids = new Set(body.ids);
      return housings.filter((housing) =>
        body.all ? !ids.has(housing.id) : ids.has(housing.id)
      );
    });
  const events = housings.map<CampaignHousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:campaign-detached',
    name: 'Retrait d’une campagne',
    nextOld: { name: campaign.title },
    nextNew: null,
    createdAt: new Date().toJSON(),
    createdBy: auth.userId,
    campaignId: campaign.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));

  await startTransaction(async () => {
    await Promise.all([
      campaignHousingRepository.removeMany(campaign, housings),
      eventRepository.insertManyCampaignHousingEvents(events)
    ]);
  });
  // TODO: return the remaining housings ?
  response.status(constants.HTTP_STATUS_OK).send();
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
  removeHousing
};

export default campaignController;
