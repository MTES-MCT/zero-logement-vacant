import type { Knex } from 'knex';

import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { HousingId } from '~/models/HousingApi';
import { HousingDocumentApi } from '~/models/HousingDocumentApi';

const logger = createLogger('documentHousingRepository');

export const DOCUMENTS_HOUSINGS_TABLE = 'documents_housings';

export const DocumentsHousings = (transaction: Knex<DocumentHousingDBO> = db) =>
  transaction<DocumentHousingDBO>(DOCUMENTS_HOUSINGS_TABLE);

export interface DocumentHousingDBO {
  document_id: string;
  housing_geo_code: string;
  housing_id: string;
}

export interface DocumentHousingLink {
  documentId: string;
  housingGeoCode: string;
  housingId: string;
}

async function create(document: HousingDocumentApi): Promise<void> {
  logger.debug('Creating document-housing link', {
    documentId: document.id,
    housingId: document.housingId
  });

  await DocumentsHousings()
    .insert(toDocumentHousingDBO(document))
    .onConflict(['document_id', 'housing_geo_code', 'housing_id'])
    .ignore(); // Idempotent: ignore duplicate links
}

async function createMany(
  documents: ReadonlyArray<HousingDocumentApi>
): Promise<void> {
  if (!documents.length) {
    return;
  }

  logger.debug('Creating document-housing links', { count: documents.length });

  await DocumentsHousings()
    .insert(documents.map(toDocumentHousingDBO))
    .onConflict(['document_id', 'housing_geo_code', 'housing_id'])
    .ignore();
}

async function remove(link: DocumentHousingLink): Promise<void> {
  logger.debug('Removing document-housing link', link);

  await DocumentsHousings()
    .where({
      document_id: link.documentId,
      housing_geo_code: link.housingGeoCode,
      housing_id: link.housingId
    })
    .delete();
}

async function findByDocument(
  documentId: string
): Promise<DocumentHousingLink[]> {
  logger.debug('Finding housings for document', { documentId });

  const links = await DocumentsHousings().where('document_id', documentId);

  return links.map(fromDocumentHousingDBO);
}

async function findByHousing(
  housing: HousingId
): Promise<DocumentHousingLink[]> {
  logger.debug('Finding documents for housing', housing);

  const links = await DocumentsHousings().where({
    housing_geo_code: housing.geoCode,
    housing_id: housing.id
  });

  return links.map(fromDocumentHousingDBO);
}

function toDocumentHousingDBO(document: HousingDocumentApi): DocumentHousingDBO {
  return {
    document_id: document.id,
    housing_geo_code: document.housingGeoCode,
    housing_id: document.housingId
  };
}

function fromDocumentHousingDBO(dbo: DocumentHousingDBO): DocumentHousingLink {
  return {
    documentId: dbo.document_id,
    housingGeoCode: dbo.housing_geo_code,
    housingId: dbo.housing_id
  };
}

const documentHousingRepository = {
  create,
  createMany,
  remove,
  findByDocument,
  findByHousing
};

export default documentHousingRepository;
