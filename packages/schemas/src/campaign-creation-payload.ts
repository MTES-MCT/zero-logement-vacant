import { type CampaignCreationPayload } from '@zerologementvacant/models';
import { object, ObjectSchema, string } from 'yup';

import { dateString } from './date-string';

export const campaignCreationPayload: ObjectSchema<CampaignCreationPayload> = object({
  title: string().trim().required('Veuillez renseigner un titre'),
  description: string().trim().required('Veuillez renseigner une description'),
  sentAt: dateString.nullable().optional().default(null)
});
