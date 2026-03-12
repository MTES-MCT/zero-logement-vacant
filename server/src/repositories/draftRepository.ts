import { FileUploadDTO } from '@zerologementvacant/models';
import async from 'async';
import { Knex } from 'knex';

import { download } from '~/controllers/fileRepository';
import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { DraftApi } from '~/models/DraftApi';
import { campaignsDraftsTable } from '~/repositories/campaignDraftRepository';
import {
  fromDocumentDBO,
  joinDocumentWithCreator,
  type DocumentWithCreatorDBO
} from '~/repositories/documentRepository';
import {
  parseSenderApi,
  SenderDBO,
  sendersTable
} from '~/repositories/senderRepository';

const logger = createLogger('draftRepository');

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
  logger.debug('Saving draft...', draft);
  await withinTransaction(async (transaction) => {
    await Drafts(transaction)
      .insert(formatDraftApi(draft))
      .onConflict('id')
      .merge([
        'subject',
        'body',
        'logo',
        'logo_next_one',
        'logo_next_two',
        'written_at',
        'written_from',
        'updated_at',
        'sender_id'
      ]);
  });
  logger.debug('Saved draft', draft);
}

function listQuery(query: Knex.QueryBuilder): void {
  query
    .select(`${draftsTable}.*`)
    .leftJoin<SenderDBO>(
      sendersTable,
      `${draftsTable}.sender_id`,
      `${sendersTable}.id`
    )
    .select(db.raw(`to_json(${sendersTable}.*) AS sender`))
  // signatory documents
  joinDocumentWithCreator(
    query,
    `${sendersTable}.signatory_one_document_id`,
    'signatory_one_doc'
  );
  joinDocumentWithCreator(
    query,
    `${sendersTable}.signatory_two_document_id`,
    'signatory_two_doc'
  );
  // logo next documents
  joinDocumentWithCreator(query, `${draftsTable}.logo_next_one`, 'logo_next_one_doc');
  joinDocumentWithCreator(query, `${draftsTable}.logo_next_two`, 'logo_next_two_doc');
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
  logo_next_one: string | null;
  logo_next_two: string | null;
  written_at: string | null;
  written_from: string | null;
  created_at: Date;
  updated_at: Date;
  establishment_id: string;
  sender_id: string;
}

export interface DraftDBO extends DraftRecordDBO {
  sender: SenderDBO;
  signatory_one_doc: DocumentWithCreatorDBO | null;
  signatory_two_doc: DocumentWithCreatorDBO | null;
  logo_next_one_doc: DocumentWithCreatorDBO | null;
  logo_next_two_doc: DocumentWithCreatorDBO | null;
}

export const formatDraftApi = (draft: DraftApi): DraftRecordDBO => ({
  id: draft.id,
  subject: draft.subject,
  body: draft.body,
  logo: draft.logo?.map((logo) => logo.id) ?? null,
  logo_next_one: draft.logoNext?.[0]?.id ?? null,
  logo_next_two: draft.logoNext?.[1]?.id ?? null,
  written_at: draft.writtenAt,
  written_from: draft.writtenFrom,
  establishment_id: draft.establishmentId,
  sender_id: draft.senderId,
  created_at: new Date(draft.createdAt),
  updated_at: new Date(draft.updatedAt)
});

export const parseDraftApi = async (draft: DraftDBO): Promise<DraftApi> => {
  let logo: FileUploadDTO[] | null = null;

  if (Array.isArray(draft.logo)) {
    try {
      logo = await Promise.all(draft.logo.map(download));
    } catch {
      logo = null;
    }
  }

  return {
    id: draft.id,
    subject: draft.subject,
    body: draft.body,
    logo: logo,
    logoNext: [
      draft.logo_next_one_doc ? fromDocumentDBO(draft.logo_next_one_doc) : null,
      draft.logo_next_two_doc ? fromDocumentDBO(draft.logo_next_two_doc) : null
    ],
    writtenAt: draft.written_at,
    writtenFrom: draft.written_from,
    establishmentId: draft.establishment_id,
    senderId: draft.sender_id,
    sender: await parseSenderApi({
      ...draft.sender,
      signatory_one_document: draft.signatory_one_doc ?? null,
      signatory_two_document: draft.signatory_two_doc ?? null
    }),
    createdAt: draft.created_at.toJSON(),
    updatedAt: draft.updated_at.toJSON()
  };
};

export default {
  find,
  findOne,
  save
};
