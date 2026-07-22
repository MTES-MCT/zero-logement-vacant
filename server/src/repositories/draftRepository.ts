import { FileUploadDTO } from '@zerologementvacant/models';
import async from 'async';
import { Knex } from 'knex';
import { sql, type Insertable } from 'kysely';

import { download } from '~/controllers/fileRepository';
import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { DraftApi } from '~/models/DraftApi';
import {
  fromDocumentDBO,
  selectDocumentWithCreator,
  type DocumentWithCreatorDBO
} from '~/repositories/documentRepository';
import { parseSenderApi, SenderDBO } from '~/repositories/senderRepository';

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
  let query = draftListQuery();
  query = applyDraftFilters(query, opts?.filters);
  query = query.orderBy('drafts.createdAt', 'desc');
  const rows = await query.execute();
  logger.debug('Found drafts', rows);
  return async.map(rows, parseDraftRow);
}

type FindOneOptions = Pick<DraftApi, 'id' | 'establishmentId'>;

async function findOne(opts: FindOneOptions): Promise<DraftApi | null> {
  let query = draftListQuery();
  query = applyDraftFilters(query, {
    id: opts.id,
    establishment: opts.establishmentId
  });
  const row = await query.executeTakeFirst();
  if (!row) {
    return null;
  }

  logger.debug('Found draft', row);
  return parseDraftRow(row);
}

async function save(draft: DraftApi): Promise<void> {
  logger.debug('Saving draft...', draft);
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('drafts')
      .values(toDraftInsert(draft))
      .onConflict((oc) =>
        oc.column('id').doUpdateSet((eb) => ({
          subject: eb.ref('excluded.subject'),
          body: eb.ref('excluded.body'),
          logo: eb.ref('excluded.logo'),
          logoNextOne: eb.ref('excluded.logoNextOne'),
          logoNextTwo: eb.ref('excluded.logoNextTwo'),
          writtenAt: eb.ref('excluded.writtenAt'),
          writtenFrom: eb.ref('excluded.writtenFrom'),
          updatedAt: eb.ref('excluded.updatedAt'),
          senderId: eb.ref('excluded.senderId')
        }))
      )
      .execute();
  });
  logger.debug('Saved draft', draft);
}

function toDraftInsert(draft: DraftApi): Insertable<DB['drafts']> {
  return {
    id: draft.id,
    subject: draft.subject,
    body: draft.body,
    logo: draft.logo?.map((logo) => logo.id) ?? null,
    logoNextOne: draft.logoNext?.[0]?.id ?? null,
    logoNextTwo: draft.logoNext?.[1]?.id ?? null,
    writtenAt: draft.writtenAt,
    writtenFrom: draft.writtenFrom,
    establishmentId: draft.establishmentId,
    senderId: draft.senderId,
    createdAt: new Date(draft.createdAt),
    updatedAt: new Date(draft.updatedAt)
  };
}

function draftListQuery(): any {
  return (
    kysely
      .selectFrom('drafts')
      .selectAll('drafts')
      .leftJoin('senders', 'drafts.senderId', 'senders.id')
      .select(sql`to_json(senders.*)`.as('sender'))
      // signatory documents (from the joined sender)
      .select(
        selectDocumentWithCreator(
          'senders.signatory_one_document_id',
          'signatory_one_doc'
        )
      )
      .select(
        selectDocumentWithCreator(
          'senders.signatory_two_document_id',
          'signatory_two_doc'
        )
      )
      // logo next documents (from the draft)
      .select(
        selectDocumentWithCreator('drafts.logo_next_one', 'logo_next_one_doc')
      )
      .select(
        selectDocumentWithCreator('drafts.logo_next_two', 'logo_next_two_doc')
      )
  );
}

function applyDraftFilters(query: any, filters?: DraftFilters): any {
  if (filters?.id) {
    query = query.where('drafts.id', '=', filters.id);
  }

  if (filters?.establishment) {
    query = query.where('drafts.establishmentId', '=', filters.establishment);
  }

  if (filters?.campaign) {
    query = query
      .innerJoin('campaignsDrafts', 'campaignsDrafts.draftId', 'drafts.id')
      .where('campaignsDrafts.campaignId', '=', filters.campaign);
  }

  return query;
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

/**
 * Camel-case Kysely mirror of {@link parseDraftApi}. The draft columns come back
 * camelCase (CamelCasePlugin) while the joined `sender` (to_json) and document
 * blobs stay snake_case (maintainNestedObjectKeys), so the existing snake-case
 * {@link parseSenderApi} and {@link fromDocumentDBO} still read them.
 */
export const parseDraftRow = async (row: any): Promise<DraftApi> => {
  let logo: FileUploadDTO[] | null = null;

  if (Array.isArray(row.logo)) {
    try {
      logo = await Promise.all(row.logo.map(download));
    } catch {
      logo = null;
    }
  }

  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    logo: logo,
    logoNext: [
      row.logoNextOneDoc ? fromDocumentDBO(row.logoNextOneDoc) : null,
      row.logoNextTwoDoc ? fromDocumentDBO(row.logoNextTwoDoc) : null
    ],
    writtenAt: row.writtenAt,
    writtenFrom: row.writtenFrom,
    establishmentId: row.establishmentId,
    senderId: row.senderId,
    sender: await parseSenderApi({
      ...row.sender,
      signatory_one_document: row.signatoryOneDoc ?? null,
      signatory_two_document: row.signatoryTwoDoc ?? null
    }),
    createdAt: new Date(row.createdAt).toJSON(),
    updatedAt: new Date(row.updatedAt).toJSON()
  };
};

export default {
  find,
  findOne,
  save
};
