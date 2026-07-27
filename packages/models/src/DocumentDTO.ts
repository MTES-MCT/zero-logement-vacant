import { Predicate } from 'effect';
import mime from 'mime';

import type { EstablishmentDTO } from './EstablishmentDTO';
import type { UserDTO } from './UserDTO';
import { UserRole } from './UserRole';

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
  establishmentId: EstablishmentDTO['id'];
  creator: UserDTO;
}

export type DocumentPayload = Pick<DocumentDTO, 'filename'>;

export const ACCEPTED_DOCUMENT_EXTENSIONS: ReadonlyArray<string> = [
  'png',
  'jpg',
  'heic',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx'
];

export const MAX_DOCUMENT_SIZE_IN_MiB = 25;

const IMAGE_TYPES = ['jpeg', 'png', 'webp'];

export function isImage(document: DocumentDTO): boolean {
  return IMAGE_TYPES.map((type) => mime.getType(type))
    .filter(Predicate.isNotNull)
    .includes(document.contentType);
}

export function isPDF(document: DocumentDTO): boolean {
  return document.contentType === mime.getType('pdf');
}

export function canWriteDocument(
  role: UserRole,
  sameEstablishment: boolean
): boolean {
  return (
    role === UserRole.ADMIN || (role === UserRole.USUAL && sameEstablishment)
  );
}
