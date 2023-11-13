import { CampaignApi } from '../models/CampaignApi';
import db from './db';
import { Knex } from 'knex';
import { CampaignFiltersApi } from '../models/CampaignFiltersApi';
import { logger } from '../utils/logger';

export const campaignsTable = 'campaigns';
export const Campaigns = () => db<CampaignDBO>(campaignsTable);

interface FindOneOptions {
  id: string;
  establishmentId: string;
}

const findOne = async (opts: FindOneOptions): Promise<CampaignApi | null> => {
  logger.debug('Finding campaign...', opts);
  const campaign: CampaignDBO | undefined = await Campaigns()
    .modify(filterQuery(opts))
    .where(`${campaignsTable}.id`, opts.id)
    // .leftJoin(groupsTable, `${groupsTable}.id`, `${campaignsTable}.group_id`)
    // .select(db.raw(`to_json(${groupsTable}.*) AS group`))
    // .groupBy(`${groupsTable}.id`)
    .first();
  if (!campaign) {
    return null;
  }

  logger.debug('Found campaign', campaign);
  return parseCampaignApi(campaign);
};

interface FindOptions {
  filters: CampaignFiltersApi;
}

const find = async (opts: FindOptions): Promise<CampaignApi[]> => {
  const campaigns: CampaignDBO[] = await Campaigns()
    .modify(filterQuery(opts.filters))
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

export interface CampaignDBO {
  id: string;
  establishment_id: string;
  filters: object;
  created_by: string;
  created_at: Date;
  validated_at?: Date;
  exported_at?: Date;
  sent_at?: Date;
  archived_at?: Date;
  sending_date?: Date;
  confirmed_at?: Date;
  title: string;
  group_id?: string;
}

const parseCampaignApi = (result: CampaignDBO): CampaignApi => ({
  id: result.id,
  establishmentId: result.establishment_id,
  filters: result.filters,
  createdBy: result.created_by,
  createdAt: result.created_at,
  validatedAt: result.validated_at,
  exportedAt: result.exported_at,
  sentAt: result.sent_at,
  archivedAt: result.archived_at,
  sendingDate: result.sending_date,
  confirmedAt: result.confirmed_at,
  title: result.title,
  groupId: result.group_id,
});

const formatCampaignApi = (campaignApi: CampaignApi) => ({
  id: campaignApi.id,
  establishment_id: campaignApi.establishmentId,
  filters: campaignApi.filters,
  title: campaignApi.title,
  created_by: campaignApi.createdBy,
  created_at: campaignApi.createdAt,
  validated_at: campaignApi.validatedAt,
  exported_at: campaignApi.exportedAt,
  sent_at: campaignApi.sentAt,
  archived_at: campaignApi.archivedAt,
  sending_date: campaignApi.sendingDate
    ? new Date(campaignApi.sendingDate)
    : undefined,
  confirmed_at: campaignApi.confirmedAt,
  group_id: campaignApi.groupId,
});

export default {
  findOne,
  find,
  insert,
  update,
  remove,
  formatCampaignApi,
};
