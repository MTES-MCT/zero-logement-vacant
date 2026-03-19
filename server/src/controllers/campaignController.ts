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
  nextStatus,
  type CampaignCreationPayload,
  type CampaignUpdatePayload,
  type GroupDTO
} from '@zerologementvacant/models';
import { slugify, timestamp } from '@zerologementvacant/utils';
import { createS3 } from '@zerologementvacant/utils/node';
import { Struct } from 'effect';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import BadRequestError from '~/errors/badRequestError';
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
import type { DraftApi } from '~/models/DraftApi';
import {
  CampaignEventApi,
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import { HousingApi, shouldReset } from '~/models/HousingApi';
import housingFiltersApi from '~/models/HousingFiltersApi';
import type { SenderApi } from '~/models/SenderApi';
import sortApi from '~/models/SortApi';
import campaignHousingRepository from '~/repositories/campaignHousingRepository';
import campaignRepository from '~/repositories/campaignRepository';
import draftRepository from '~/repositories/draftRepository';
import eventRepository from '~/repositories/eventRepository';
import groupRepository from '~/repositories/groupRepository';
import housingRepository from '~/repositories/housingRepository';
import senderRepository from '~/repositories/senderRepository';
import mailService from '~/services/mailService';
import { isFeatureEnabled } from '~/services/posthogService';
import { isArrayOf, isString, isUUID, isUUIDParam } from '~/utils/validators';

const getCampaignValidators = [param('id').notEmpty().isUUID()];

const get: RequestHandler<
  { id: CampaignDTO['id'] },
  CampaignDTO,
  never,
  never
> = async (request, response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    CampaignDTO
  >;
  logger.info('Get campaign', {
    campaign: params.id
  });

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(toCampaignDTO(campaign));
};

const downloadCampaign: RequestHandler<
  { id: CampaignDTO['id'] },
  string,
  never,
  never
> = async (request, response) => {
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
};

const listValidators: ValidationChain[] = [
  ...campaignFiltersValidators,
  ...sortApi.queryValidators
];

const list: RequestHandler<
  never,
  ReadonlyArray<CampaignDTO>,
  never,
  CampaignQuery
> = async (request, response) => {
  const { auth, query } = request as AuthenticatedRequest<
    never,
    ReadonlyArray<CampaignDTO>,
    never,
    CampaignQuery
  >;
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
};

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

  const flagEnabled = await isFeatureEnabled(
    'new-campaigns',
    auth.establishmentId
  );
  if (flagEnabled) {
    response.status(constants.HTTP_STATUS_NOT_FOUND).end();
    return;
  }

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
    createdBy: user,
    establishmentId: auth.establishmentId,
    returnCount: null,
    returnRate: null,
    housingCount: 0,
    ownerCount: 0
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

/**
 * @deprecated Use {createFromGroup} instead.
 * @param request
 * @param response 
 */
const createCampaignFromGroup: RequestHandler<
  { id: GroupDTO['id'] },
  CampaignDTO,
  CampaignCreationPayloadDTO,
  never
> = async (request, response): Promise<void> => {
  const { auth, body, params, user } = request as AuthenticatedRequest<
    { id: GroupDTO['id'] },
    CampaignDTO,
    CampaignCreationPayloadDTO,
    never
  >;
  const groupId = params.id;
  logger.info('Create campaign from group', { groupId });

  const group = await groupRepository.findOne({
    id: groupId,
    establishmentId: auth.establishmentId
  });
  if (!group || !!group.archivedAt) {
    throw new GroupMissingError(params.id);
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
    createdBy: user,
    establishmentId: auth.establishmentId,
    returnCount: null,
    returnRate: null,
    housingCount: 0,
    ownerCount: 0
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
};
const createCampaignFromGroupValidators: ValidationChain[] = [
  param('id').isUUID().notEmpty(),
  body('title').isString().notEmpty(),
  body('description').optional({ nullable: true }).isString()
];

const createFromGroup: RequestHandler<
  { id: GroupDTO['id'] },
  CampaignDTO,
  CampaignCreationPayload,
  never
> = async (request, response) => {
  const { auth, body, params, user } = request as AuthenticatedRequest<
    { id: GroupDTO['id'] },
    CampaignDTO,
    CampaignCreationPayload,
    never
  >;

  logger.info('Create campaign from group', {
    group: params.id,
    body
  });

  const group = await groupRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!group || !!group.archivedAt) {
    throw new GroupMissingError(params.id);
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
    sentAt: body.sentAt,
    groupId: params.id,
    userId: auth.userId,
    createdBy: user,
    establishmentId: auth.establishmentId,
    returnCount: null,
    returnRate: null,
    housingCount: 0,
    ownerCount: 0
  };

  const sender: SenderApi = {
    id: uuidv4(),
    name: null,
    service: null,
    firstName: null,
    lastName: null,
    address: null,
    email: null,
    phone: null,
    signatories: [null, null],
    establishmentId: auth.establishmentId,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
  }
  const draft: DraftApi= {
    id: uuidv4(),
    body: null,
    subject: null,
    writtenAt: null,
    writtenFrom: null,
    logo: null,
    logoNext: [null, null],
    sender,
    senderId: sender.id,
    establishmentId: auth.establishmentId,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON()
  }

  const housings = await housingRepository.find({
    filters: {
      establishmentIds: [auth.establishmentId],
      groupIds: [group.id]
    },
    pagination: {
      paginate: false
    }
  });
  const campaignHousingEvents = housings.map<CampaignHousingEventApi>(
    (housing) => ({
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
    })
  );

  const neverContactedHousings = housings.filter(
    (housing) => housing.status === HousingStatus.NEVER_CONTACTED
  );
  const housingEvents = neverContactedHousings.map<HousingEventApi>(
    (housing) => ({
      id: uuidv4(),
      type: 'housing:status-updated',
      name: 'Changement de statut de suivi',
      nextOld: {
        status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
      },
      nextNew: {
        status: HOUSING_STATUS_LABELS[HousingStatus.WAITING]
      },
      createdAt: new Date().toJSON(),
      createdBy: auth.userId,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    })
  );

  await startTransaction(async () => {
    await senderRepository.save(sender);
    await draftRepository.save(draft);
    await campaignRepository.save(campaign);

    await Promise.all([
      campaignHousingRepository.insertHousingList(campaign.id, housings),
      housingRepository.updateMany(
        housings.map((housing) => Struct.pick(housing, 'geoCode', 'id')),
        {
          status: HousingStatus.WAITING,
          subStatus: null
        }
      ),
      eventRepository.insertManyCampaignHousingEvents(campaignHousingEvents),
      eventRepository.insertManyHousingEvents(housingEvents)
    ]);
  });

  response.status(constants.HTTP_STATUS_CREATED).json(toCampaignDTO(campaign));
};

const updateNext: RequestHandler<
  { id: CampaignApi['id'] },
  CampaignDTO,
  CampaignUpdatePayload,
  never
> = async (request, response): Promise<void> => {
  const { auth, body, params } = request as AuthenticatedRequest<
    { id: CampaignApi['id'] },
    never,
    CampaignUpdatePayload,
    never
  >;
  logger.info('Update campaign', { id: params.id, body });

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  if (campaign.sentAt !== null && campaign.sentAt !== undefined && body.sentAt === null) {
    throw new BadRequestError('sentAt cannot be unset once it has been set');
  }

  const updated: CampaignApi = {
    ...campaign,
    title: body.title,
    description: body.description,
    sentAt: body.sentAt ?? campaign.sentAt
  };

  await campaignRepository.save(updated);
  response.status(constants.HTTP_STATUS_OK).json(toCampaignDTO(updated));
};

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
const update: RequestHandler<
  { id: CampaignDTO['id'] },
  CampaignDTO,
  CampaignUpdatePayloadDTO,
  never
> = async (request, response): Promise<void> => {
  const { auth, body, params } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    CampaignDTO,
    CampaignUpdatePayloadDTO,
    never
  >;

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
};

const removeCampaign: RequestHandler<
  { id: CampaignDTO['id'] },
  void,
  never,
  never
> = async (request, response): Promise<void> => {
  const { auth, params } = request as AuthenticatedRequest<
    { id: string },
    void,
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
const removeHousing: RequestHandler<
  { id: CampaignDTO['id'] },
  never,
  CampaignRemovalPayloadDTO,
  never
> = async (request, response): Promise<void> => {
  logger.info('Remove campaign housing list');

  const { auth, body, params } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
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
};

const campaignController = {
  getCampaignValidators,
  get,
  downloadCampaign,
  listValidators,
  list,
  create,
  createValidators,
  createFromGroup,
  createCampaignFromGroup,
  createCampaignFromGroupValidators,
  update,
  updateValidators,
  updateNext,
  removeCampaign,
  removeHousingValidators,
  removeHousing
};

export default campaignController;
