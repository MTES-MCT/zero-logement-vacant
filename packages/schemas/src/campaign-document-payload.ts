import { DocumentDTO } from '@zerologementvacant/models';
import type { ObjectSchema } from 'yup';

import { documentIdsPayload } from './document-ids-payload';

export interface CampaignDocumentPayload {
  documentIds: Array<DocumentDTO['id']>;
}

export const campaignDocumentPayload: ObjectSchema<CampaignDocumentPayload> =
  documentIdsPayload();
