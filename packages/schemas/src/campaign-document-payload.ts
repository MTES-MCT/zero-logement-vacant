import { DocumentDTO } from '@zerologementvacant/models';
import { array, object, type ObjectSchema, string } from 'yup';

export interface CampaignDocumentPayload {
  documentIds: Array<DocumentDTO['id']>;
}

export const campaignDocumentPayload: ObjectSchema<CampaignDocumentPayload> =
  object({
    documentIds: array().of(string().uuid().required()).min(1).required()
  });
