import { Knex } from 'knex';

import { CampaignStatus, HousingFiltersDTO } from '@zerologementvacant/models';
import { CampaignApi, CampaignSortApi } from '~/models/CampaignApi';
import db from '~/infra/database';
import { CampaignFiltersApi } from '~/models/CampaignFiltersApi';
import { logger } from '~/infra/logger';
import { sortQuery } from '~/models/SortApi';
import queue from '~/infra/queue';

export const campaignsTable = 'campaigns';
export const Campaigns = (transaction = db) =>
  transaction<CampaignDBO>(campaignsTable);

interface FindOneOptions {
  id: string;
  establishmentId: string;
}

const findOne = async (opts: FindOneOptions): Promise<CampaignApi | null> => {
  logger.debug('Finding campaign...', opts);
  const campaign: CampaignDBO | undefined = await Campaigns()
    .modify(filterQuery(opts))
    .where(`${campaignsTable}.id`, opts.id)
    .first();
  if (!campaign) {
    return null;
  }

  logger.debug('Found campaign', campaign);
  return parseCampaignApi(campaign);
};

interface FindOptions {
  filters: CampaignFiltersApi;
  sort?: CampaignSortApi;
}

const find = async (opts: FindOptions): Promise<CampaignApi[]> => {
  const campaigns: CampaignDBO[] = await Campaigns()
    .modify(filterQuery(opts.filters))
    .modify(campaignSortQuery(opts.sort))
    .orderBy('created_at');

  return campaigns.map(parseCampaignApi);
};

const filterQuery = (filters: CampaignFiltersApi) => {
  return function (query: Knex.QueryBuilder<CampaignDBO>) {
    if (filters?.establishmentId) {
      query.where('establishment_id', filters.establishmentId);
    }
    if (filters.groupIds?.length) {
      query.whereIn('group_id', filters.groupIds);
    }
  };
};

const campaignSortQuery = (sort?: CampaignSortApi) =>
  sortQuery(sort, {
    keys: {
      createdAt: (query) =>
        query.orderBy(`${campaignsTable}.created_at`, sort?.createdAt),
      sentAt: (query) =>
        query.orderBy(`${campaignsTable}.sent_at`, sort?.sentAt),
      status: (query) =>
        query.orderByRaw(
          `(case ${campaignsTable}.status when 'archived' then 3 when 'in-progress' then 2 when 'sending' then 1 else 0 end) ${sort?.status}`
        )
    },
    default: (query) => query.orderBy('created_at', 'desc')
  });

const insert = async (campaignApi: CampaignApi): Promise<CampaignApi> => {
  logger.info(
    'Insert campaignApi for establishment',
    campaignApi.establishmentId
  );
  return db(campaignsTable)
    .insert(formatCampaignApi(campaignApi))
    .returning('*')
    .then((_) => parseCampaignApi(_[0]));
};

async function save(campaign: CampaignApi): Promise<void> {
  logger.debug('Saving campaign', campaign);
  await Campaigns()
    .insert(formatCampaignApi(campaign))
    .onConflict(['id'])
    .merge(['status', 'title', 'file', 'sent_at']);
  logger.debug('Campaign saved', campaign);
}

const update = async (campaignApi: CampaignApi): Promise<string> => {
  return db(campaignsTable)
    .where('id', campaignApi.id)
    .update(formatCampaignApi(campaignApi))
    .returning('*')
    .then((_) => _[0]);
};

const remove = async (campaignId: string): Promise<void> => {
  await db(campaignsTable).delete().where('id', campaignId);
};

async function generateMails(campaign: CampaignApi): Promise<void> {
  await queue.add('campaign:generate', {
    campaignId: campaign.id,
    establishmentId: campaign.establishmentId
  });
  logger.info('Generating campaign mails', campaign);
}

export interface CampaignDBO {
  id: string;
  title: string;
  status: CampaignStatus;
  filters: HousingFiltersDTO;
  file?: string;
  user_id: string;
  created_at: Date;
  validated_at?: Date;
  exported_at?: Date;
  sent_at?: Date;
  archived_at?: Date;
  confirmed_at?: Date;
  establishment_id: string;
  group_id?: string;
}

export const parseCampaignApi = (campaign: CampaignDBO): CampaignApi => ({
  id: campaign.id,
  establishmentId: campaign.establishment_id,
  status: campaign.status,
  filters: campaign.filters,
  file: campaign.file,
  userId: campaign.user_id,
  createdAt: campaign.created_at.toJSON(),
  validatedAt: campaign.validated_at?.toJSON(),
  exportedAt: campaign.exported_at?.toJSON(),
  sentAt: campaign.sent_at?.toJSON(),
  archivedAt: campaign.archived_at?.toJSON(),
  confirmedAt: campaign.confirmed_at?.toJSON(),
  title: campaign.title,
  groupId: campaign.group_id
});

export const formatCampaignApi = (campaign: CampaignApi): CampaignDBO => ({
  id: campaign.id,
  establishment_id: campaign.establishmentId,
  status: campaign.status,
  filters: campaign.filters,
  file: campaign.file,
  title: campaign.title,
  user_id: campaign.userId,
  created_at: new Date(campaign.createdAt),
  validated_at: campaign.validatedAt
    ? new Date(campaign.validatedAt)
    : undefined,
  exported_at: campaign.exportedAt ? new Date(campaign.exportedAt) : undefined,
  sent_at: campaign.sentAt ? new Date(campaign.sentAt) : undefined,
  archived_at: campaign.archivedAt ? new Date(campaign.archivedAt) : undefined,
  confirmed_at: campaign.confirmedAt
    ? new Date(campaign.confirmedAt)
    : undefined,
  group_id: campaign.groupId
});

export default {
  findOne,
  find,
  insert,
  save,
  update,
  remove,
  generateMails,
  formatCampaignApi
};
