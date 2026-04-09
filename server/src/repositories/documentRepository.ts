import type { Knex } from 'knex';

import db, { fromDateDBO, toDateDBO } from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { DocumentApi } from '~/models/DocumentApi';
import { UserDBO, parseUserApi, USERS_TABLE } from './userRepository';

const logger = createLogger('documentRepository');

export const DOCUMENTS_TABLE = 'documents';

export const Documents = (transaction: Knex<DocumentDBO> = db) =>
  transaction<DocumentDBO>(DOCUMENTS_TABLE);

export interface DocumentDBO {
  id: string;
  filename: string;
  s3_key: string;
  content_type: string;
  size_bytes: number;
  establishment_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string | null;
  deleted_at: Date | string | null;
}

export type DocumentWithCreatorDBO = DocumentDBO & {
  creator: UserDBO;
};

interface FindOneOptions {
  filters?: {
    establishmentIds?: string[];
    deleted?: boolean;
  };
}

interface FindOptions {
  filters?: {
    ids?: string[];
    establishmentIds?: string[];
    deleted?: boolean;
  };
}

async function findOne(
  id: string,
  options?: FindOneOptions
): Promise<DocumentApi | null> {
  logger.debug('Finding document...', { id });

  const document = await queryWithCreator()
    .where(`${DOCUMENTS_TABLE}.id`, id)
    .modify((query) => {
      if (options?.filters?.establishmentIds?.length) {
        query.whereIn(
          `${DOCUMENTS_TABLE}.establishment_id`,
          options.filters.establishmentIds
        );
      }
      if (options?.filters?.deleted === true) {
        query.whereNotNull(`${DOCUMENTS_TABLE}.deleted_at`);
      } else if (options?.filters?.deleted === false) {
        query.whereNull(`${DOCUMENTS_TABLE}.deleted_at`);
      }
    })
    .first();

  return document ? fromDocumentDBO(document) : null;
}

async function find(options?: FindOptions): Promise<DocumentApi[]> {
  logger.debug('Finding documents...', options);

  const documents = await queryWithCreator().modify((query) => {
    if (options?.filters?.ids?.length) {
      query.whereIn(`${DOCUMENTS_TABLE}.id`, options.filters.ids);
    }
    if (options?.filters?.establishmentIds?.length) {
      query.whereIn(
        `${DOCUMENTS_TABLE}.establishment_id`,
        options.filters.establishmentIds
      );
    }
    if (options?.filters?.deleted === false) {
      query.whereNull(`${DOCUMENTS_TABLE}.deleted_at`);
    }
  });

  return documents.map(fromDocumentDBO);
}

async function insert(document: DocumentApi): Promise<void> {
  logger.debug('Inserting document...', { id: document.id });
  await Documents().insert(toDocumentDBO(document));
}

async function insertMany(
  documents: ReadonlyArray<DocumentApi>
): Promise<void> {
  if (!documents.length) {
    return;
  }

  logger.debug('Inserting documents...', { count: documents.length });
  await Documents().insert(documents.map(toDocumentDBO));
}

async function update(document: DocumentApi): Promise<void> {
  logger.debug('Updating document...', { id: document.id });

  await withinTransaction(async (transaction) => {
    await Documents(transaction)
      .where('id', document.id)
      .update({
        ...toDocumentDBO(document),
        updated_at: new Date()
      });
  });
}

async function remove(id: string): Promise<void> {
  logger.debug('Soft-deleting document...', { id });
  await Documents().where('id', id).update({ deleted_at: new Date() });
}

/**
 * Adds a left-join to `documents` (aliased as `docAlias`) and its creator
 * (aliased as `${docAlias}_creator`), selecting the document+creator as a
 * single JSON column named `docAlias`. Returns NULL when no document exists.
 */
export function joinDocumentWithCreator(
  query: Knex.QueryBuilder,
  parentFkColumn: string,
  docAlias: string
): void {
  const creatorAlias = `${docAlias}_creator`;
  query
    .leftJoin({ [docAlias]: DOCUMENTS_TABLE }, parentFkColumn, `${docAlias}.id`)
    .leftJoin(
      { [creatorAlias]: USERS_TABLE },
      `${creatorAlias}.id`,
      `${docAlias}.created_by`
    )
    .select(
      db.raw(`
        CASE WHEN ${docAlias}.id IS NOT NULL THEN
          jsonb_build_object(
            'id', ${docAlias}.id,
            'filename', ${docAlias}.filename,
            's3_key', ${docAlias}.s3_key,
            'content_type', ${docAlias}.content_type,
            'size_bytes', ${docAlias}.size_bytes,
            'establishment_id', ${docAlias}.establishment_id,
            'created_by', ${docAlias}.created_by,
            'created_at', ${docAlias}.created_at,
            'updated_at', ${docAlias}.updated_at,
            'deleted_at', ${docAlias}.deleted_at,
            'creator', json_build_object(
              'id', ${creatorAlias}.id,
              'email', ${creatorAlias}.email,
              'first_name', ${creatorAlias}.first_name,
              'last_name', ${creatorAlias}.last_name,
              'role', ${creatorAlias}.role,
              'establishment_id', ${creatorAlias}.establishment_id,
              'time_per_week', ${creatorAlias}.time_per_week,
              'phone', ${creatorAlias}.phone,
              'position', ${creatorAlias}.position,
              'updated_at', ${creatorAlias}.updated_at
            )
          )
        ELSE NULL END AS ${docAlias}
      `)
    );
}

// Query builder with creator join
function queryWithCreator() {
  return Documents()
    .select(
      `${DOCUMENTS_TABLE}.*`,
      db.raw(`json_build_object(
        'id', ${USERS_TABLE}.id,
        'email', ${USERS_TABLE}.email,
        'first_name', ${USERS_TABLE}.first_name,
        'last_name', ${USERS_TABLE}.last_name,
        'role', ${USERS_TABLE}.role,
        'establishment_id', ${USERS_TABLE}.establishment_id,
        'time_per_week', ${USERS_TABLE}.time_per_week,
        'phone', ${USERS_TABLE}.phone,
        'position', ${USERS_TABLE}.position,
        'updated_at', ${USERS_TABLE}.updated_at
      ) as creator`)
    )
    .join(USERS_TABLE, `${USERS_TABLE}.id`, `${DOCUMENTS_TABLE}.created_by`);
}

export function toDocumentDBO(document: DocumentApi): DocumentDBO {
  return {
    id: document.id,
    filename: document.filename,
    s3_key: document.s3Key,
    content_type: document.contentType,
    size_bytes: document.sizeBytes,
    establishment_id: document.establishmentId,
    created_by: document.createdBy,
    created_at: toDateDBO(document.createdAt),
    updated_at: document.updatedAt ? toDateDBO(document.updatedAt) : null,
    deleted_at: document.deletedAt ? toDateDBO(document.deletedAt) : null
  };
}

export function fromDocumentDBO(dbo: DocumentWithCreatorDBO): DocumentApi {
  if (!dbo.creator) {
    throw new Error('Creator not fetched');
  }

  return {
    id: dbo.id,
    filename: dbo.filename,
    s3Key: dbo.s3_key,
    contentType: dbo.content_type,
    sizeBytes: dbo.size_bytes,
    establishmentId: dbo.establishment_id,
    createdBy: dbo.created_by,
    createdAt: fromDateDBO(dbo.created_at),
    updatedAt: dbo.updated_at ? fromDateDBO(dbo.updated_at) : null,
    deletedAt: dbo.deleted_at ? fromDateDBO(dbo.deleted_at) : null,
    creator: parseUserApi(dbo.creator)
  };
}

const documentRepository = {
  find,
  findOne,
  insert,
  insertMany,
  update,
  remove
};

export default documentRepository;
