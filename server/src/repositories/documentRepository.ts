import type { Knex } from 'knex';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { DocumentApi } from '~/models/DocumentApi';
import { UserDBO, parseUserApi, usersTable } from './userRepository';

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
  created_at: string;
  updated_at: Date | null;
  deleted_at: Date | null;
}

type DocumentWithCreatorDBO = DocumentDBO & {
  creator: UserDBO;
};

interface FindOneOptions {
  filters?: {
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

async function findMany(
  ids: string[],
  options?: FindOneOptions
): Promise<DocumentApi[]> {
  if (!ids.length) {
    return [];
  }

  logger.debug('Finding documents...', { count: ids.length });

  const documents = await queryWithCreator()
    .whereIn(`${DOCUMENTS_TABLE}.id`, ids)
    .modify((query) => {
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
  await Documents()
    .where('id', document.id)
    .update({
      ...toDocumentDBO(document),
      updated_at: new Date()
    });
}

async function remove(id: string): Promise<void> {
  logger.debug('Soft-deleting document...', { id });
  await Documents().where('id', id).update({ deleted_at: new Date() });
}

// Query builder with creator join
function queryWithCreator() {
  return Documents()
    .select(
      `${DOCUMENTS_TABLE}.*`,
      db.raw(`json_build_object(
        'id', ${usersTable}.id,
        'email', ${usersTable}.email,
        'first_name', ${usersTable}.first_name,
        'last_name', ${usersTable}.last_name,
        'role', ${usersTable}.role,
        'establishment_id', ${usersTable}.establishment_id,
        'time_per_week', ${usersTable}.time_per_week,
        'phone', ${usersTable}.phone,
        'position', ${usersTable}.position,
        'updated_at', ${usersTable}.updated_at
      ) as creator`)
    )
    .join(usersTable, `${usersTable}.id`, `${DOCUMENTS_TABLE}.created_by`);
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
    created_at: document.createdAt,
    updated_at: document.updatedAt ? new Date(document.updatedAt) : null,
    deleted_at: document.deletedAt ? new Date(document.deletedAt) : null
  };
}

function fromDocumentDBO(dbo: DocumentWithCreatorDBO): DocumentApi {
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
    createdAt: dbo.created_at,
    updatedAt: dbo.updated_at?.toJSON() ?? null,
    deletedAt: dbo.deleted_at?.toJSON() ?? null,
    creator: parseUserApi(dbo.creator)
  };
}

const documentRepository = {
  findOne,
  findMany,
  insert,
  insertMany,
  update,
  remove
};

export default documentRepository;
