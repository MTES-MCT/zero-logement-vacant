import type { Knex } from 'knex';
import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import type { DocumentApi } from '~/models/DocumentApi';
import { HousingId, type HousingApi } from '~/models/HousingApi';
import { HousingDocumentApi } from '~/models/HousingDocumentApi';
import {
  parseUserApi,
  UserDBO,
  usersTable
} from '~/repositories/userRepository';
import { toDocumentDBO, type DocumentDBO } from './documentRepository';

const logger = createLogger('housingDocumentRepository');

export const DOCUMENTS_TABLE = 'documents';
export const HOUSING_DOCUMENT_TABLE = 'documents_housings';

export const Documents = (transaction: Knex<DocumentDBO> = db) =>
  transaction<DocumentDBO>(DOCUMENTS_TABLE);
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

async function create(document: HousingDocumentApi): Promise<void> {
  await createMany([document]);
}

/**
 * Create documents and associate them to housings.
 * @param document
 * @param housings
 * @returns
 */
async function createManyForManyHousings(
  documents: ReadonlyArray<DocumentApi>,
  housings: ReadonlyArray<HousingApi>
): Promise<void> {
  if (!housings.length) {
    logger.debug('No housing provided. Skipping...');
    return;
  }

  if (!documents.length) {
    logger.debug('No document provided. Skipping...');
    return;
  }

  const housingDocuments = documents.flatMap((document) => {
    return housings.map<HousingDocumentApi>((housing) => ({
      ...document,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    }));
  });
  await withinTransaction(async (transaction) => {
    await Documents(transaction).insert(documents.map(toDocumentDBO));
    await transaction.batchInsert(
      HOUSING_DOCUMENT_TABLE,
      housingDocuments.map(toHousingDocumentDBO)
    );
  });
}

async function createMany(
  documents: ReadonlyArray<HousingDocumentApi>
): Promise<void> {
  if (!documents.length) {
    return;
  }

  logger.debug('Inserting housing documents...', {
    documents: documents.length
  });
  await withinTransaction(async (transaction) => {
    await transaction.batchInsert(
      DOCUMENTS_TABLE,
      documents.map(toDocumentDBO)
    );
    await transaction.batchInsert(
      HOUSING_DOCUMENT_TABLE,
      documents.map(toHousingDocumentDBO)
    );
  });
}

interface FindByHousingOptions {
  filters?: {
    deleted?: boolean;
  };
}

async function findByHousing(
  housing: HousingId,
  options?: FindByHousingOptions
): Promise<HousingDocumentApi[]> {
  logger.debug('Finding housing documents...', housing);
  const documents = await listQuery()
    .where({
      [`${HOUSING_DOCUMENT_TABLE}.housing_geo_code`]: housing.geoCode,
      [`${HOUSING_DOCUMENT_TABLE}.housing_id`]: housing.id
    })
    .modify((query) => {
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

async function update(document: HousingDocumentApi): Promise<void> {
  logger.debug('Updating housing document...', { id: document.id });
  await Documents().where('id', document.id).update(toDocumentDBO(document));
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
    id: dbo.id,
    housingId: dbo.housing_id,
    housingGeoCode: dbo.housing_geo_code,
    filename: dbo.filename,
    s3Key: dbo.s3_key,
    contentType: dbo.content_type,
    sizeBytes: dbo.size_bytes,
    createdBy: dbo.created_by,
    createdAt: dbo.created_at,
    updatedAt: dbo.updated_at?.toJSON() ?? null,
    deletedAt: dbo.deleted_at?.toJSON() ?? null,
    creator: parseUserApi(dbo.creator)
  };
}

const housingDocumentRepository = {
  create,
  createMany,
  createManyForManyHousings,
  findByHousing,
  get,
  update,
  remove
};

export default housingDocumentRepository;
