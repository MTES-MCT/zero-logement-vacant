import type { Knex } from 'knex';
import type { Insertable, Selectable } from 'kysely';

import db, { fromDateDBO } from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { CampaignApi } from '~/models/CampaignApi';
import { CampaignDocumentApi } from '~/models/CampaignDocumentApi';
import { UserDBO, fromUserDBO } from '~/repositories/userRepository';

import {
  creatorJsonBuildObject,
  fromDocumentDBO,
  type DocumentDBO
} from './documentRepository';

const logger = createLogger('campaignDocumentRepository');

export const CAMPAIGN_DOCUMENT_TABLE = 'documents_campaigns';

export const CampaignDocuments = (
  transaction: Knex<CampaignDocumentDBO> = db
) => transaction<CampaignDocumentDBO>(CAMPAIGN_DOCUMENT_TABLE);

export interface CampaignDocumentDBO {
  document_id: string;
  campaign_id: string;
}

type CampaignDocumentWithCreatorDBO = DocumentDBO &
  CampaignDocumentDBO & {
    creator: UserDBO;
  };

async function link(document: CampaignDocumentApi): Promise<void> {
  logger.debug('Creating document-campaign link', {
    documentId: document.id,
    campaignId: document.campaignId
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('documentsCampaigns')
      .values(toCampaignDocumentInsert(document))
      .onConflict((oc) => oc.columns(['documentId', 'campaignId']).doNothing()) // Idempotent: ignore duplicate links
      .execute();
  });
}

async function linkMany(
  campaignDocuments: ReadonlyArray<CampaignDocumentDBO>
): Promise<CampaignDocumentDBO[]> {
  if (campaignDocuments.length === 0) {
    logger.debug('No campaign documents to link. Skipping...');
    return [];
  }

  logger.debug('Linking documents to campaigns...', { campaignDocuments });

  let inserted: CampaignDocumentDBO[] = [];
  await withinKyselyTransaction(async (trx) => {
    const rows = await trx
      .insertInto('documentsCampaigns')
      .values(campaignDocuments.map(linkToInsert))
      .onConflict((oc) => oc.columns(['documentId', 'campaignId']).doNothing())
      // Return only the links actually inserted so callers can emit events
      // just for new links (existing links are ignored by onConflict).
      .returning(['documentId', 'campaignId'])
      .execute();
    inserted = rows.map((row) => ({
      document_id: row.documentId,
      campaign_id: row.campaignId
    }));
  });
  return inserted;
}

async function unlink(link: {
  documentId: string;
  campaignId: string;
}): Promise<number> {
  logger.debug('Unlinking document from campaign...', link);

  let deletedCount = 0;
  await withinKyselyTransaction(async (trx) => {
    const result = await trx
      .deleteFrom('documentsCampaigns')
      .where('documentId', '=', link.documentId)
      .where('campaignId', '=', link.campaignId)
      .executeTakeFirst();
    deletedCount = Number(result?.numDeletedRows ?? 0n);
  });
  return deletedCount;
}

async function unlinkMany(params: { documentIds: string[] }): Promise<void> {
  if (!params.documentIds.length) {
    logger.debug('No documents to unlink. Skipping...');
    return;
  }

  logger.debug('Unlinking documents from campaigns...', {
    documents: params.documentIds.length
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom('documentsCampaigns')
      .where('documentId', 'in', params.documentIds)
      .execute();
  });

  logger.debug('Documents unlinked from campaigns', {
    documents: params.documentIds.length
  });
}

interface FindOptions {
  filters?: {
    documentIds?: string[];
    campaignIds?: Array<CampaignApi['id']>;
    deleted?: boolean;
  };
}

async function find(
  options?: FindOptions
): Promise<ReadonlyArray<CampaignDocumentApi>> {
  logger.debug('Finding document-campaign links...', options);

  let query = listQuery();

  if (options?.filters?.documentIds?.length) {
    query = query.where(
      'documentsCampaigns.documentId',
      'in',
      options.filters.documentIds
    );
  }

  if (options?.filters?.campaignIds?.length) {
    query = query.where(
      'documentsCampaigns.campaignId',
      'in',
      options.filters.campaignIds
    );
  }

  if (options?.filters?.deleted === true) {
    query = query.where('documents.deletedAt', 'is not', null);
  } else if (options?.filters?.deleted === false) {
    query = query.where('documents.deletedAt', 'is', null);
  }

  const rows = await query.orderBy('documents.createdAt', 'desc').execute();
  return rows.map(parseCampaignDocumentRow);
}

interface GetOptions {
  campaign?: Array<CampaignApi['id']>;
}

async function get(
  id: string,
  options?: GetOptions
): Promise<CampaignDocumentApi | null> {
  logger.debug('Getting campaign document...', { id });

  let query = listQuery().where('documentsCampaigns.documentId', '=', id);

  if (options?.campaign?.length) {
    query = query.where(
      'documentsCampaigns.campaignId',
      'in',
      options.campaign
    );
  }

  const row = await query.executeTakeFirst();
  return row ? parseCampaignDocumentRow(row) : null;
}

async function remove(document: CampaignDocumentApi): Promise<void> {
  logger.debug('Soft-deleting campaign document...', document);
  await withinKyselyTransaction(async (trx) => {
    await trx
      .updateTable('documents')
      .set({ deletedAt: new Date() })
      .where('id', '=', document.id)
      .execute();
  });
}

// Base query joining documents, their campaign links, and the creator.
function listQuery() {
  return kysely
    .selectFrom('documents')
    .innerJoin(
      'documentsCampaigns',
      'documentsCampaigns.documentId',
      'documents.id'
    )
    .innerJoin('users', 'users.id', 'documents.createdBy')
    .selectAll('documents')
    .select(['documentsCampaigns.campaignId'])
    .select(creatorJsonBuildObject.as('creator'));
}

export function toCampaignDocumentDBO(
  document: CampaignDocumentApi
): CampaignDocumentDBO {
  return {
    document_id: document.id,
    campaign_id: document.campaignId
  };
}

export function toCampaignDocumentInsert(
  document: CampaignDocumentApi
): Insertable<DB['documentsCampaigns']> {
  return {
    documentId: document.id,
    campaignId: document.campaignId
  };
}

function linkToInsert(
  link: CampaignDocumentDBO
): Insertable<DB['documentsCampaigns']> {
  return {
    documentId: link.document_id,
    campaignId: link.campaign_id
  };
}

export function fromCampaignDocumentDBO(
  dbo: CampaignDocumentWithCreatorDBO
): CampaignDocumentApi {
  if (!dbo.creator) {
    throw new Error('Creator not fetched');
  }

  return {
    ...fromDocumentDBO(dbo),
    campaignId: dbo.campaign_id
  };
}

type CampaignDocumentRow = Selectable<DB['documents']> &
  Pick<Selectable<DB['documentsCampaigns']>, 'campaignId'> & {
    creator: UserDBO | null;
  };

function parseCampaignDocumentRow(
  row: CampaignDocumentRow
): CampaignDocumentApi {
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
    campaignId: row.campaignId
  };
}

const campaignDocumentRepository = {
  link,
  linkMany,
  unlink,
  unlinkMany,
  find,
  get,
  remove
};

export default campaignDocumentRepository;
