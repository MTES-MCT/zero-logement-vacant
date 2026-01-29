import { DocumentDTO } from '@zerologementvacant/models';

import { UserApi, toUserDTO } from './UserApi';

/**
 * Backend representation of a document (unlinked to any entity)
 */
export interface DocumentApi extends Omit<DocumentDTO, 'creator' | 'url'> {
  s3Key: string;
  establishmentId: string;
  createdBy: string;
  deletedAt: string | null;
  creator: UserApi;
}

/**
 * Convert DocumentApi to DocumentDTO with pre-signed URL
 */
export function toDocumentDTO(document: DocumentApi, url: string): DocumentDTO {
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
