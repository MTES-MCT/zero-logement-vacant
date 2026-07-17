import type { Knex } from 'knex';
import type { Insertable, Selectable } from 'kysely';
import { sql } from 'kysely';

import db, { fromDateDBO } from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { HousingId } from '~/models/HousingApi';
import { HousingDocumentApi } from '~/models/HousingDocumentApi';
import { UserDBO, fromUserDBO } from '~/repositories/userRepository';

import { fromDocumentDBO, type DocumentDBO } from './documentRepository';

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

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('documentsHousings')
      .values(toHousingDocumentInsert(document))
      .onConflict((oc) =>
        oc.columns(['documentId', 'housingGeoCode', 'housingId']).doNothing()
      ) // Idempotent: ignore duplicate links
      .execute();
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

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('documentsHousings')
      .values(housingDocuments.map(linkToInsert))
      .onConflict((oc) =>
        oc.columns(['documentId', 'housingGeoCode', 'housingId']).doNothing()
      )
      .execute();
  });
}

async function unlink(link: {
  documentId: string;
  housingId: string;
  housingGeoCode: string;
}): Promise<void> {
  logger.debug('Unlinking document from housing...', link);

  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom('documentsHousings')
      .where('documentId', '=', link.documentId)
      .where('housingGeoCode', '=', link.housingGeoCode)
      .where('housingId', '=', link.housingId)
      .execute();
  });
}

async function unlinkMany(params: { documentIds: string[] }): Promise<void> {
  if (!params.documentIds.length) {
    logger.debug('No documents to unlink. Skipping...');
    return;
  }

  logger.debug('Unlinking documents from housings...', {
    documents: params.documentIds.length
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom('documentsHousings')
      .where('documentId', 'in', params.documentIds)
      .execute();
  });

  logger.debug('Documents unlinked from housings', {
    documents: params.documentIds.length
  });
}

interface FindOptions {
  filters?: {
    documentIds?: string[];
    housingIds?: HousingId[];
    /**
     * Filters on non-deleted documents by default to avoid leaking
     * soft-deleted documents by omission. Pass `true` to fetch soft-deleted
     * documents instead. There is no way to fetch both at once in a single
     * call — issue two calls and merge if that's ever needed.
     * @default false
     */
    deleted?: boolean;
  };
}

async function find(
  options?: FindOptions
): Promise<ReadonlyArray<HousingDocumentApi>> {
  logger.debug('Finding document-housing links...', options);

  let query = listQuery();

  if (options?.filters?.documentIds?.length) {
    query = query.where(
      'documentsHousings.documentId',
      'in',
      options.filters.documentIds
    );
  }

  if (options?.filters?.housingIds?.length) {
    const housingIds = options.filters.housingIds;
    query = query.where((eb) =>
      eb.or(
        housingIds.map((housing) =>
          eb.and([
            eb('documentsHousings.housingGeoCode', '=', housing.geoCode),
            eb('documentsHousings.housingId', '=', housing.id)
          ])
        )
      )
    );
  }

  if (options?.filters?.deleted === true) {
    query = query.where('documents.deletedAt', 'is not', null);
  } else {
    query = query.where('documents.deletedAt', 'is', null);
  }

  const rows = await query.orderBy('documents.createdAt', 'desc').execute();
  return rows.map(parseHousingDocumentRow);
}

interface GetOptions {
  housing?: HousingId[];
}

async function get(
  id: string,
  options?: GetOptions
): Promise<HousingDocumentApi | null> {
  logger.debug('Getting housing document...', { id });

  let query = listQuery().where('documentsHousings.documentId', '=', id);

  if (options?.housing?.length) {
    const housings = options.housing;
    query = query.where((eb) =>
      eb.or(
        housings.map((housing) =>
          eb.and([
            eb('documentsHousings.housingGeoCode', '=', housing.geoCode),
            eb('documentsHousings.housingId', '=', housing.id)
          ])
        )
      )
    );
  }

  const row = await query.executeTakeFirst();
  return row ? parseHousingDocumentRow(row) : null;
}

async function remove(document: HousingDocumentApi): Promise<void> {
  logger.debug('Soft-deleting housing document...', document);
  await kysely
    .updateTable('documents')
    .set({ deletedAt: new Date() })
    .where('id', '=', document.id)
    .execute();
}

// Base query joining documents, their housing links, and the creator.
function listQuery() {
  return kysely
    .selectFrom('documents')
    .innerJoin(
      'documentsHousings',
      'documentsHousings.documentId',
      'documents.id'
    )
    .innerJoin('users', 'users.id', 'documents.createdBy')
    .selectAll('documents')
    .select(['documentsHousings.housingGeoCode', 'documentsHousings.housingId'])
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

export function toHousingDocumentDBO(
  document: HousingDocumentApi
): HousingDocumentDBO {
  return {
    document_id: document.id,
    housing_geo_code: document.housingGeoCode,
    housing_id: document.housingId
  };
}

function toHousingDocumentInsert(
  document: HousingDocumentApi
): Insertable<DB['documentsHousings']> {
  return {
    documentId: document.id,
    housingGeoCode: document.housingGeoCode,
    housingId: document.housingId
  };
}

function linkToInsert(
  link: HousingDocumentDBO
): Insertable<DB['documentsHousings']> {
  return {
    documentId: link.document_id,
    housingGeoCode: link.housing_geo_code,
    housingId: link.housing_id
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

type HousingDocumentRow = Selectable<DB['documents']> &
  Pick<Selectable<DB['documentsHousings']>, 'housingGeoCode' | 'housingId'> & {
    creator: UserDBO | null;
  };

function parseHousingDocumentRow(row: HousingDocumentRow): HousingDocumentApi {
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
    creator: fromUserDBO(row.creator),
    housingGeoCode: row.housingGeoCode,
    housingId: row.housingId
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
