import { Knex } from 'knex';

import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { DraftApi } from '~/models/DraftApi';
import { campaignsDraftsTable } from '~/repositories/campaignDraftRepository';
import {
  parseSenderApi,
  SenderDBO,
  sendersTable
} from '~/repositories/senderRepository';
import { download } from '~/controllers/fileRepository';
import async from 'async';

export const draftsTable = 'drafts';
export const Drafts = (transaction: Knex<DraftRecordDBO> = db) =>
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
  return async.map(drafts, parseDraftApi);
}

type FindOneOptions = Pick<DraftApi, 'id' | 'establishmentId'>;

async function findOne(opts: FindOneOptions): Promise<DraftApi | null> {
  const draft = await Drafts()
    .modify(listQuery)
    .where(
      filterQuery({
        id: opts.id,
        establishment: opts.establishmentId
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
    .merge([
      'subject',
      'body',
      'logo',
      'written_at',
      'written_from',
      'updated_at',
      'sender_id'
    ]);
}

function listQuery(query: Knex.QueryBuilder): void {
  query
    .select(`${draftsTable}.*`)
    .leftJoin<SenderDBO>(
      sendersTable,
      `${draftsTable}.sender_id`,
      `${sendersTable}.id`
    )
    .select(db.raw(`to_json(${sendersTable}.*) AS sender`));
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

export interface DraftRecordDBO {
  id: string;
  subject: string | null;
  body: string | null;
  logo: string[] | null;
  written_at: string | null;
  written_from: string | null;
  created_at: Date;
  updated_at: Date;
  establishment_id: string;
  sender_id: string;
}

export interface DraftDBO extends DraftRecordDBO {
  sender: SenderDBO;
}

export const formatDraftApi = (draft: DraftApi): DraftRecordDBO => ({
  id: draft.id,
  subject: draft.subject,
  body: draft.body,
  logo: draft.logo?.map((logo) => logo.id) ?? null,
  written_at: draft.writtenAt,
  written_from: draft.writtenFrom,
  establishment_id: draft.establishmentId,
  sender_id: draft.senderId,
  created_at: new Date(draft.createdAt),
  updated_at: new Date(draft.updatedAt)
});

export const parseDraftApi = async (draft: DraftDBO): Promise<DraftApi> => ({
  id: draft.id,
  subject: draft.subject,
  body: draft.body,
  logo: await async.map(draft.logo ?? [], download),
  writtenAt: draft.written_at,
  writtenFrom: draft.written_from,
  establishmentId: draft.establishment_id,
  senderId: draft.sender_id,
  sender: await parseSenderApi(draft.sender),
  createdAt: draft.created_at.toJSON(),
  updatedAt: draft.updated_at.toJSON()
});

export default {
  find,
  findOne,
  save
};
