import { HousingDocumentDTO } from '@zerologementvacant/models';
import { UserApi, toUserDTO } from './UserApi';

export interface HousingDocumentApi extends Omit<HousingDocumentDTO, 'creator' | 'url'> {
  housingId: string;
  housingGeoCode: string;
  s3Key: string;
  createdBy: string;
  deletedAt: string | null;
  creator: UserApi;
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
  return {
    id: document.id,
    filename: document.filename,
    url,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    creator: toUserDTO(document.creator)
  };
}
