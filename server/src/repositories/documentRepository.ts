import type { Knex } from 'knex';
import type { Insertable, Selectable } from 'kysely';
import { sql } from 'kysely';

import db, { fromDateDBO, toDateDBO } from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { DocumentApi } from '~/models/DocumentApi';

import { UserDBO, fromUserDBO, USERS_TABLE } from './userRepository';

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

  let query = queryWithCreator().where('documents.id', '=', id);
  if (options?.filters?.establishmentIds?.length) {
    query = query.where(
      'documents.establishmentId',
      'in',
      options.filters.establishmentIds
    );
  }
  if (options?.filters?.deleted === true) {
    query = query.where('documents.deletedAt', 'is not', null);
  } else if (options?.filters?.deleted === false) {
    query = query.where('documents.deletedAt', 'is', null);
  }

  const row = await query.executeTakeFirst();
  return row ? parseDocumentRow(row) : null;
}

async function find(options?: FindOptions): Promise<DocumentApi[]> {
  logger.debug('Finding documents...', options);

  let query = queryWithCreator();
  if (options?.filters?.ids?.length) {
    query = query.where('documents.id', 'in', options.filters.ids);
  }
  if (options?.filters?.establishmentIds?.length) {
    query = query.where(
      'documents.establishmentId',
      'in',
      options.filters.establishmentIds
    );
  }
  if (options?.filters?.deleted === false) {
    query = query.where('documents.deletedAt', 'is', null);
  }

  const rows = await query.execute();
  return rows.map(parseDocumentRow);
}

async function insert(document: DocumentApi): Promise<void> {
  logger.debug('Inserting document...', { id: document.id });
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('documents')
      .values(toDocumentInsert(document))
      .execute();
  });
}

async function insertMany(
  documents: ReadonlyArray<DocumentApi>
): Promise<void> {
  if (!documents.length) {
    return;
  }

  logger.debug('Inserting documents...', { count: documents.length });
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('documents')
      .values(documents.map(toDocumentInsert))
      .execute();
  });
}

async function update(document: DocumentApi): Promise<void> {
  logger.debug('Updating document...', { id: document.id });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .updateTable('documents')
      .set({ ...toDocumentInsert(document), updatedAt: new Date() })
      .where('id', '=', document.id)
      .execute();
  });
}

async function remove(id: string): Promise<void> {
  logger.debug('Soft-deleting document...', { id });
  await withinKyselyTransaction(async (trx) => {
    await trx
      .updateTable('documents')
      .set({ deletedAt: new Date() })
      .where('id', '=', id)
      .execute();
  });
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

/**
 * Kysely mirror of {@link joinDocumentWithCreator}. Returns a correlated scalar
 * subquery that builds the document + nested creator JSON blob for the document
 * referenced by `fkColumn` (a raw, table-qualified snake_case column such as
 * `senders.signatory_one_document_id`). The blob keys stay snake_case — the
 * CamelCasePlugin's `maintainNestedObjectKeys` leaves them untouched, so
 * {@link fromDocumentDBO} reads them. Resolves to NULL when the FK is null or
 * no matching document exists, matching the Knex `CASE WHEN ... ELSE NULL END`.
 */
export function selectDocumentWithCreator(fkColumn: string, alias: string) {
  return sql`(
    SELECT jsonb_build_object(
      'id', d.id,
      'filename', d.filename,
      's3_key', d.s3_key,
      'content_type', d.content_type,
      'size_bytes', d.size_bytes,
      'establishment_id', d.establishment_id,
      'created_by', d.created_by,
      'created_at', d.created_at,
      'updated_at', d.updated_at,
      'deleted_at', d.deleted_at,
      'creator', json_build_object(
        'id', u.id,
        'email', u.email,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'role', u.role,
        'establishment_id', u.establishment_id,
        'time_per_week', u.time_per_week,
        'phone', u.phone,
        'position', u.position,
        'updated_at', u.updated_at
      )
    )
    FROM ${sql.raw(DOCUMENTS_TABLE)} d
    LEFT JOIN ${sql.raw(USERS_TABLE)} u ON u.id = d.created_by
    WHERE d.id = ${sql.raw(fkColumn)}
  )`.as(alias);
}

// Kysely query builder with the creator embedded as a JSON column.
// The creator fields mirror the Knex `queryWithCreator` projection (no
// sensitive columns) so the parsed `UserDBO` shape is unchanged.
function queryWithCreator() {
  return kysely
    .selectFrom('documents')
    .innerJoin('users', 'users.id', 'documents.createdBy')
    .selectAll('documents')
    .select(
      sql<UserDBO>`json_build_object(
        'id', users.id,
        'email', users.email,
        'first_name', users.first_name,
        'last_name', users.last_name,
        'role', users.role,
        'establishment_id', users.establishment_id,
        'time_per_week', users.time_per_week,
        'phone', users.phone,
        'position', users.position,
        'updated_at', users.updated_at
      )`.as('creator')
    );
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

function toDocumentInsert(document: DocumentApi): Insertable<DB['documents']> {
  return {
    id: document.id,
    filename: document.filename,
    s3Key: document.s3Key,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    establishmentId: document.establishmentId,
    createdBy: document.createdBy,
    createdAt: toDateDBO(document.createdAt),
    updatedAt: document.updatedAt ? toDateDBO(document.updatedAt) : null,
    deletedAt: document.deletedAt ? toDateDBO(document.deletedAt) : null
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
    creator: fromUserDBO(dbo.creator)
  };
}

type DocumentRow = Selectable<DB['documents']> & { creator: UserDBO | null };

function parseDocumentRow(row: DocumentRow): DocumentApi {
  if (!row.creator) {
    throw new Error('Creator not fetched');
  }

  return {
    id: row.id,
    filename: row.filename,
    s3Key: row.s3Key,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    establishmentId: row.establishmentId,
    createdBy: row.createdBy,
    createdAt: fromDateDBO(row.createdAt),
    updatedAt: row.updatedAt ? fromDateDBO(row.updatedAt) : null,
    deletedAt: row.deletedAt ? fromDateDBO(row.deletedAt) : null,
    creator: fromUserDBO(row.creator)
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
