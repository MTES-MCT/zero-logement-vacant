import type { Knex } from 'knex';
import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { HousingId } from '~/models/HousingApi';
import { HousingDocumentApi } from '~/models/HousingDocumentApi';
import { UserDBO, usersTable } from '~/repositories/userRepository';
import {
  Documents,
  DOCUMENTS_TABLE,
  fromDocumentDBO,
  type DocumentDBO
} from './documentRepository';

const logger = createLogger('housingDocumentRepository');

export const HOUSING_DOCUMENT_TABLE = 'documents_housings';

export const HousingDocuments = (transaction: Knex<HousingDocumentDBO> = db) =>
  transaction<HousingDocumentDBO>(HOUSING_DOCUMENT_TABLE);

export interface HousingDocumentDBO {
  document_id: string;
  housing_geo_code: string;
  housing_id: string;
}

type HousingDocumentWithCreatorDBO = DocumentDBO &
  HousingDocumentDBO & {
    creator: UserDBO;
  };

async function link(document: HousingDocumentApi): Promise<void> {
  logger.debug('Creating document-housing link', {
    documentId: document.id,
    housingId: document.housingId
  });

  await withinTransaction(async (transaction) => {
    await HousingDocuments(transaction)
      .insert(toHousingDocumentDBO(document))
      .onConflict(['document_id', 'housing_geo_code', 'housing_id'])
      .ignore(); // Idempotent: ignore duplicate links
  });
}

async function linkMany(
  housingDocuments: ReadonlyArray<HousingDocumentDBO>
): Promise<void> {
  if (housingDocuments.length === 0) {
    logger.debug('No housing documents to link. Skipping...');
    return;
  }

  logger.debug('Linking documents to housings...', {
    housingDocuments
  });

  await withinTransaction(async (transaction) => {
    await HousingDocuments(transaction)
      .insert(housingDocuments)
      .onConflict(['document_id', 'housing_geo_code', 'housing_id'])
      .ignore();
  });
}

async function unlink(link: {
  documentId: string;
  housingId: string;
  housingGeoCode: string;
}): Promise<void> {
  logger.debug('Unlinking document from housing...', link);

  await HousingDocuments()
    .where({
      document_id: link.documentId,
      housing_geo_code: link.housingGeoCode,
      housing_id: link.housingId
    })
    .delete();
}

async function unlinkMany(params: {
  documentIds: string[];
}): Promise<void> {
  if (!params.documentIds.length) {
    logger.debug('No documents to unlink. Skipping...');
    return;
  }

  logger.debug('Unlinking documents from housings...', {
    documents: params.documentIds.length
  });

  await withinTransaction(async (transaction) => {
    await HousingDocuments(transaction)
      .whereIn('document_id', params.documentIds)
      .delete();
  });

  logger.debug('Documents unlinked from housings', {
    documents: params.documentIds.length
  });
}

interface FindOptions {
  filters?: {
    documentIds?: string[];
    housingIds?: HousingId[];
    deleted?: boolean;
  };
}

async function find(
  options?: FindOptions
): Promise<ReadonlyArray<HousingDocumentApi>> {
  logger.debug('Finding document-housing links...', options);

  const documents = await listQuery()
    .modify((query) => {
      if (options?.filters?.documentIds?.length) {
        query.whereIn(
          `${HOUSING_DOCUMENT_TABLE}.document_id`,
          options.filters.documentIds
        );
      }

      if (options?.filters?.housingIds?.length) {
        query.whereIn(
          [
            `${HOUSING_DOCUMENT_TABLE}.housing_geo_code`,
            `${HOUSING_DOCUMENT_TABLE}.housing_id`
          ],
          options.filters.housingIds.map((h) => [h.geoCode, h.id])
        );
      }

      if (options?.filters?.deleted === true) {
        query.whereNotNull(`${DOCUMENTS_TABLE}.deleted_at`);
      } else if (options?.filters?.deleted === false) {
        query.whereNull(`${DOCUMENTS_TABLE}.deleted_at`);
      }
    })
    .orderBy(`${DOCUMENTS_TABLE}.created_at`, 'desc');

  return documents.map(fromHousingDocumentDBO);
}

interface GetOptions {
  housing?: HousingId[];
}

async function get(
  id: string,
  options?: GetOptions
): Promise<HousingDocumentApi | null> {
  logger.debug('Getting housing document...', { id });
  const document = await listQuery()
    .where(`${HOUSING_DOCUMENT_TABLE}.document_id`, id)
    .modify((query) => {
      if (options?.housing?.length) {
        query.whereIn(
          [
            `${HOUSING_DOCUMENT_TABLE}.housing_geo_code`,
            `${HOUSING_DOCUMENT_TABLE}.housing_id`
          ],
          options.housing.map((housing) => [housing.geoCode, housing.id])
        );
      }
    })
    .first();

  return document ? fromHousingDocumentDBO(document) : null;
}

async function remove(document: HousingDocumentApi): Promise<void> {
  logger.debug('Soft-deleting housing document...', document);
  await Documents().where('id', document.id).update({ deleted_at: new Date() });
}

// Base query with creator join
function listQuery() {
  return Documents()
    .select(
      `${DOCUMENTS_TABLE}.*`,
      `${HOUSING_DOCUMENT_TABLE}.housing_geo_code`,
      `${HOUSING_DOCUMENT_TABLE}.housing_id`,
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
    .join(
      HOUSING_DOCUMENT_TABLE,
      `${HOUSING_DOCUMENT_TABLE}.document_id`,
      `${DOCUMENTS_TABLE}.id`
    )
    .join(usersTable, `${usersTable}.id`, `${DOCUMENTS_TABLE}.created_by`);
}

export function toHousingDocumentDBO(
  document: HousingDocumentApi
): HousingDocumentDBO {
  return {
    document_id: document.id,
    housing_geo_code: document.housingGeoCode,
    housing_id: document.housingId
  };
}

export function fromHousingDocumentDBO(
  dbo: HousingDocumentWithCreatorDBO
): HousingDocumentApi {
  if (!dbo.creator) {
    throw new Error('Creator not fetched');
  }

  return {
    ...fromDocumentDBO(dbo),
    housingGeoCode: dbo.housing_geo_code,
    housingId: dbo.housing_id
  };
}

const housingDocumentRepository = {
  link,
  linkMany,
  unlink,
  unlinkMany,
  find,
  get,
  remove
};

export default housingDocumentRepository;
