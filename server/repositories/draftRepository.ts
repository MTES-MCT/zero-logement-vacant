import { Knex } from 'knex';

import db from './db';
import { DraftApi } from '../models/DraftApi';
import { campaignsDraftsTable } from './campaignDraftRepository';
import { logger } from '../utils/logger';

export const draftsTable = 'drafts';
export const Drafts = (transaction: Knex<DraftDBO> = db) =>
  transaction(draftsTable);

export interface DraftFilters {
  id?: string;
  campaign?: string;
  establishment?: string;
}

interface FindOptions {
  filters?: DraftFilters;
}

async function find(opts?: FindOptions): Promise<DraftApi[]> {
  logger.debug('Finding drafts...', opts);
  const drafts: DraftDBO[] = await Drafts()
    .modify(listQuery)
    .modify(filterQuery(opts?.filters))
    .orderBy('created_at', 'desc');
  logger.debug('Found drafts', drafts);
  return drafts.map(parseDraftApi);
}

type FindOneOptions = Pick<DraftApi, 'id' | 'establishmentId'>;

async function findOne(opts: FindOneOptions): Promise<DraftApi | null> {
  const draft = await Drafts()
    .modify(listQuery)
    .where(
      filterQuery({
        id: opts.id,
        establishment: opts.establishmentId,
      })
    )
    .first();
  if (!draft) {
    return null;
  }

  logger.debug('Found draft', draft);
  return parseDraftApi(draft);
}

async function save(draft: DraftApi): Promise<void> {
  await Drafts()
    .insert(formatDraftApi(draft))
    .onConflict('id')
    .merge(['body', 'updated_at']);
}

function listQuery(query: Knex.QueryBuilder): void {
  query.select(`${draftsTable}.*`);
}

function filterQuery(filters?: DraftFilters) {
  return (query: Knex.QueryBuilder): void => {
    if (filters?.id) {
      query.where(`${draftsTable}.id`, filters.id);
    }

    if (filters?.establishment) {
      query.where(`${draftsTable}.establishment_id`, filters.establishment);
    }

    if (filters?.campaign) {
      query
        .join(
          campaignsDraftsTable,
          `${campaignsDraftsTable}.draft_id`,
          `${draftsTable}.id`
        )
        .where(`${campaignsDraftsTable}.campaign_id`, filters.campaign);
    }
  };
}

export interface DraftDBO {
  id: string;
  body: string;
  created_at: Date;
  updated_at: Date;
  establishment_id: string;
}

export const formatDraftApi = (draft: DraftApi): DraftDBO => ({
  id: draft.id,
  body: draft.body,
  created_at: new Date(draft.createdAt),
  updated_at: new Date(draft.updatedAt),
  establishment_id: draft.establishmentId,
});

export const parseDraftApi = (draft: DraftDBO): DraftApi => ({
  id: draft.id,
  body: draft.body,
  createdAt: draft.created_at.toJSON(),
  updatedAt: draft.updated_at.toJSON(),
  establishmentId: draft.establishment_id,
});

export default {
  find,
  findOne,
  save,
};