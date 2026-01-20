import type { DocumentApi } from '~/models/DocumentApi';

export interface DocumentDBO {
  id: string;
  filename: string;
  s3_key: string;
  content_type: string;
  size_bytes: number;
  created_by: string;
  created_at: string;
  updated_at: Date | null;
  deleted_at: Date | null;
}

export function toDocumentDBO(document: DocumentApi): DocumentDBO {
  return {
    id: document.id,
    filename: document.filename,
    s3_key: document.s3Key,
    content_type: document.contentType,
    size_bytes: document.sizeBytes,
    created_by: document.createdBy,
    created_at: document.createdAt,
    updated_at: document.updatedAt ? new Date(document.updatedAt) : null,
    deleted_at: document.deletedAt ? new Date(document.deletedAt) : null
  };
}
