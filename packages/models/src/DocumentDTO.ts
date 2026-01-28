import { Predicate } from 'effect';
import mime from 'mime';

import type { UserDTO } from './UserDTO';

export interface DocumentDTO {
  id: string;
  filename: string;
  /*
   ** Pre-signed URL
   */
  url: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string | null;
  creator: UserDTO;
}

export type DocumentPayload = Pick<DocumentDTO, 'filename'>;

const IMAGE_TYPES = ['jpeg', 'png', 'webp'];

export function isImage(document: Pick<DocumentDTO, 'contentType'>): boolean {
  return IMAGE_TYPES.map((type) => mime.getType(type))
    .filter(Predicate.isNotNull)
    .includes(document.contentType);
}

export function isPDF(document: Pick<DocumentDTO, 'contentType'>): boolean {
  return document.contentType === mime.getType('pdf');
}
