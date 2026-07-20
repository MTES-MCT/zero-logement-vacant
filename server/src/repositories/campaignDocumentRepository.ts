import type { Knex } from 'knex';

import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { CampaignApi } from '~/models/CampaignApi';
import { CampaignDocumentApi } from '~/models/CampaignDocumentApi';
import { UserDBO, USERS_TABLE } from '~/repositories/userRepository';

import {
  Documents,
  DOCUMENTS_TABLE,
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

  await withinTransaction(async (transaction) => {
    await CampaignDocuments(transaction)
      .insert(toCampaignDocumentDBO(document))
      .onConflict(['document_id', 'campaign_id'])
      .ignore();
  });
}

async function linkMany(
  campaignDocuments: ReadonlyArray<CampaignDocumentDBO>
): Promise<void> {
  if (campaignDocuments.length === 0) {
    logger.debug('No campaign documents to link. Skipping...');
    return;
  }

  logger.debug('Linking documents to campaigns...', { campaignDocuments });

  await withinTransaction(async (transaction) => {
    await CampaignDocuments(transaction)
      .insert(campaignDocuments)
      .onConflict(['document_id', 'campaign_id'])
      .ignore();
  });
}

async function unlink(link: {
  documentId: string;
  campaignId: string;
}): Promise<void> {
  logger.debug('Unlinking document from campaign...', link);

  await CampaignDocuments()
    .where({
      document_id: link.documentId,
      campaign_id: link.campaignId
    })
    .delete();
}

async function unlinkMany(params: { documentIds: string[] }): Promise<void> {
  if (!params.documentIds.length) {
    logger.debug('No documents to unlink. Skipping...');
    return;
  }

  logger.debug('Unlinking documents from campaigns...', {
    documents: params.documentIds.length
  });

  await withinTransaction(async (transaction) => {
    await CampaignDocuments(transaction)
      .whereIn('document_id', params.documentIds)
      .delete();
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

  const documents = await listQuery()
    .modify((query) => {
      if (options?.filters?.documentIds?.length) {
        query.whereIn(
          `${CAMPAIGN_DOCUMENT_TABLE}.document_id`,
          options.filters.documentIds
        );
      }

      if (options?.filters?.campaignIds?.length) {
        query.whereIn(
          `${CAMPAIGN_DOCUMENT_TABLE}.campaign_id`,
          options.filters.campaignIds
        );
      }

      if (options?.filters?.deleted === true) {
        query.whereNotNull(`${DOCUMENTS_TABLE}.deleted_at`);
      } else if (options?.filters?.deleted === false) {
        query.whereNull(`${DOCUMENTS_TABLE}.deleted_at`);
      }
    })
    .orderBy(`${DOCUMENTS_TABLE}.created_at`, 'desc');

  return documents.map(fromCampaignDocumentDBO);
}

interface GetOptions {
  campaign?: Array<CampaignApi['id']>;
}

async function get(
  id: string,
  options?: GetOptions
): Promise<CampaignDocumentApi | null> {
  logger.debug('Getting campaign document...', { id });
  const document = await listQuery()
    .where(`${CAMPAIGN_DOCUMENT_TABLE}.document_id`, id)
    .modify((query) => {
      if (options?.campaign?.length) {
        query.whereIn(
          `${CAMPAIGN_DOCUMENT_TABLE}.campaign_id`,
          options.campaign
        );
      }
    })
    .first();

  return document ? fromCampaignDocumentDBO(document) : null;
}

async function remove(document: CampaignDocumentApi): Promise<void> {
  logger.debug('Soft-deleting campaign document...', document);
  await Documents().where('id', document.id).update({ deleted_at: new Date() });
}

function listQuery() {
  return Documents()
    .select(
      `${DOCUMENTS_TABLE}.*`,
      `${CAMPAIGN_DOCUMENT_TABLE}.campaign_id`,
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
    .join(
      CAMPAIGN_DOCUMENT_TABLE,
      `${CAMPAIGN_DOCUMENT_TABLE}.document_id`,
      `${DOCUMENTS_TABLE}.id`
    )
    .join(USERS_TABLE, `${USERS_TABLE}.id`, `${DOCUMENTS_TABLE}.created_by`);
}

export function toCampaignDocumentDBO(
  document: CampaignDocumentApi
): CampaignDocumentDBO {
  return {
    document_id: document.id,
    campaign_id: document.campaignId
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
