import { DocumentDTO } from '@zerologementvacant/models';

import { UserApi, toUserDTO } from './UserApi';
import { Equivalence } from 'effect';

/**
 * Backend representation of a document (unlinked to any entity)
 */
export interface DocumentApi extends Omit<DocumentDTO, 'creator' | 'url'> {
  s3Key: string;
  createdBy: string;
  deletedAt: string | null;
  creator: UserApi;
}

/**
 * Equivalence instance for DocumentApi based on id and filename.
 */
export const DocumentFilenameEquivalence: Equivalence.Equivalence<DocumentApi> =
  Equivalence.struct({
    id: Equivalence.string,
    filename: Equivalence.string
  });

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
    establishmentId: document.establishmentId,
    creator: toUserDTO(document.creator)
  };
}
