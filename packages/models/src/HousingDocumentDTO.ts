import type { DocumentDTO } from './DocumentDTO';

export type HousingDocumentDTO = DocumentDTO;

export const ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS: ReadonlyArray<string> = [
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