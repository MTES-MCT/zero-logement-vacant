import { DocumentDTO } from '@zerologementvacant/models';
import {
  generatePresignedUrl,
  type GeneratePresignedUrlOptions
} from '@zerologementvacant/utils/node';
import { Equivalence } from 'effect';

import { UserApi, fromUserDTO, toUserDTO } from './UserApi';

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

export type FetchDocumentURLOptions = Pick<
  GeneratePresignedUrlOptions,
  's3' | 'bucket' | 'expiresIn'
>;

/**
 * Convert DocumentApi to DocumentDTO, fetching a pre-signed URL from S3.
 */
export async function toDocumentDTO(
  document: DocumentApi,
  options: FetchDocumentURLOptions
): Promise<DocumentDTO> {
  const url = await generatePresignedUrl({
    ...options,
    key: document.s3Key
  });
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

/**
 * @deprecated Exists only to facilitate migration from `draftController.create` to `draftController.createNext`
 * and `draftController.update` to `draftController.updateNext`. Should be removed once the migration is complete.
 */
export function fromDocumentDTO(document: DocumentDTO): DocumentApi {
  return {
    id: document.id,
    filename: document.filename,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    establishmentId: document.establishmentId,
    s3Key: '', // s3Key is not stored in DocumentDTO, must be set separately
    createdBy: document.creator.id,
    deletedAt: null, // deletedAt is not stored in DocumentDTO, must be managed separately
    creator: fromUserDTO(document.creator)
  }
}