import { HousingDocumentDTO } from '@zerologementvacant/models';

import { DocumentApi, toDocumentDTO } from './DocumentApi';

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
export function toHousingDocumentDTO(
  document: HousingDocumentApi,
  url: string
): HousingDocumentDTO {
  return toDocumentDTO(document, url);
}
