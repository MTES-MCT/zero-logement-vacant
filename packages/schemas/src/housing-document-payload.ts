import { DocumentDTO } from '@zerologementvacant/models';
import type { ObjectSchema } from 'yup';

import { documentIdsPayload } from './document-ids-payload';

export interface HousingDocumentPayload {
  documentIds: Array<DocumentDTO['id']>;
}

export const housingDocumentPayload: ObjectSchema<HousingDocumentPayload> =
  documentIdsPayload();
