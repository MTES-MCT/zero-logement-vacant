import { HousingDocumentDTO } from '@zerologementvacant/models';

import {
  DocumentApi,
  toDocumentDTO,
  type FetchDocumentURLOptions
} from './DocumentApi';

/**
 * Backend representation of a document linked to a housing
 */
export interface HousingDocumentApi extends DocumentApi {
  housingId: string;
  housingGeoCode: string;
}

/**
 * Create a HousingDocumentDTO object with a pre-signed S3 URL.
 * @param document
 * @param url A pre-signed URL returned from the S3-compatible storage
 * @returns
 */
export async function toHousingDocumentDTO(
  document: HousingDocumentApi,
  options: FetchDocumentURLOptions
): Promise<HousingDocumentDTO> {
  return toDocumentDTO(document, options);
}
