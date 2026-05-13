import {
  CampaignDTO,
  CampaignRemovalPayload,
  HOUSING_STATUS_LABELS,
  HousingStatus,
  type CampaignCreationPayload,
  type CampaignUpdatePayload,
  type GroupDTO
} from '@zerologementvacant/models';
import { Struct } from 'effect';
import { RequestHandler } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { ValidationChain } from 'express-validator';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import BadRequestError from '~/errors/badRequestError';
import CampaignMissingError from '~/errors/campaignMissingError';
import GroupMissingError from '~/errors/groupMissingError';
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
import { CampaignHousingEventApi, HousingEventApi } from '~/models/EventApi';
import { HousingApi, shouldReset } from '~/models/HousingApi';
import type { SenderApi } from '~/models/SenderApi';
import sortApi from '~/models/SortApi';
import campaignDraftRepository from '~/repositories/campaignDraftRepository';
import campaignHousingRepository from '~/repositories/campaignHousingRepository';
import campaignRepository from '~/repositories/campaignRepository';
import draftRepository from '~/repositories/draftRepository';
import eventRepository from '~/repositories/eventRepository';
import groupRepository from '~/repositories/groupRepository';
import housingRepository from '~/repositories/housingRepository';
import senderRepository from '~/repositories/senderRepository';

const list: RequestHandler<
  never,
  ReadonlyArray<CampaignDTO>,
  never,
  CampaignQuery
> = async (request, response) => {
  const { auth, query, effectiveGeoCodes } = request as AuthenticatedRequest<
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
      groupIds:
        typeof query.groups === 'string' ? [query.groups] : query.groups,
      geoCodes: effectiveGeoCodes
    },
    sort
  });
  response.status(constants.HTTP_STATUS_OK).json(campaigns.map(toCampaignDTO));
};

const get: RequestHandler<
  { id: CampaignDTO['id'] },
  CampaignDTO,
  never,
  never
> = async (request, response): Promise<void> => {
  const { auth, effectiveGeoCodes, params } = request as AuthenticatedRequest<
    { id: CampaignDTO['id'] },
    CampaignDTO
  >;
  logger.info('Get campaign', {
    campaign: params.id
  });

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
    geoCodes: effectiveGeoCodes
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  response.status(constants.HTTP_STATUS_OK).json(toCampaignDTO(campaign));
};

const listValidators: ValidationChain[] = [
  ...campaignFiltersValidators,
  ...sortApi.queryValidators
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
    updatedAt: new Date().toJSON()
  };
  const draft: DraftApi = {
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
  };

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
    await campaignDraftRepository.save(campaign, draft);

    await Promise.all([
      campaignHousingRepository.insertHousingList(campaign.id, housings),
      housingRepository.updateMany(
        neverContactedHousings.map((housing) =>
          Struct.pick(housing, 'geoCode', 'id')
        ),
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

const update: RequestHandler<
  { id: CampaignApi['id'] },
  CampaignDTO,
  CampaignUpdatePayload,
  never
> = async (request, response): Promise<void> => {
  const { auth, body, effectiveGeoCodes, params } =
    request as AuthenticatedRequest<
      { id: CampaignApi['id'] },
      never,
      CampaignUpdatePayload,
      never
    >;
  logger.info('Update campaign', { id: params.id, body });

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
    geoCodes: effectiveGeoCodes
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  if (
    campaign.sentAt !== null &&
    campaign.sentAt !== undefined &&
    body.sentAt === null
  ) {
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

const removeCampaign: RequestHandler<
  { id: CampaignDTO['id'] },
  void,
  never,
  never
> = async (request, response): Promise<void> => {
  const { auth, effectiveGeoCodes, params } = request as AuthenticatedRequest<
    { id: string },
    void,
    never,
    never
  >;

  logger.info('Remove campaign', params.id);

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
    geoCodes: effectiveGeoCodes
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
      nextOld: {
        status: HOUSING_STATUS_LABELS[HousingStatus.WAITING],
        subStatus: housing.subStatus
      },
      nextNew: {
        status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED],
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

const removeHousing: RequestHandler<
  { id: CampaignDTO['id'] },
  never,
  CampaignRemovalPayload,
  never
> = async (request, response): Promise<void> => {
  logger.info('Remove campaign housing list');

  const { auth, body, effectiveGeoCodes, params } =
    request as AuthenticatedRequest<
      { id: CampaignDTO['id'] },
      never,
      CampaignRemovalPayload,
      never
    >;

  const campaign = await campaignRepository.findOne({
    id: params.id,
    establishmentId: auth.establishmentId,
    geoCodes: effectiveGeoCodes
  });
  if (!campaign) {
    throw new CampaignMissingError(params.id);
  }

  const housings = await housingRepository.find({
    filters: {
      ...body,
      establishmentIds: [auth.establishmentId],
      campaignIds: [params.id]
    },
    pagination: { paginate: false }
  });
  const events = housings.map<CampaignHousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:campaign-detached',
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
  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
};

const campaignController = {
  get,
  listValidators,
  list,
  createFromGroup,
  update,
  removeCampaign,
  removeHousing
};

export default campaignController;
