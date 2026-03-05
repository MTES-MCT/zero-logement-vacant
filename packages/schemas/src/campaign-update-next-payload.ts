import { ObjectSchema, object, string } from 'yup';

import { CampaignUpdatePayload } from '@zerologementvacant/models';
import { dateString } from './date-string';

export const campaignUpdateNextPayload: ObjectSchema<CampaignUpdatePayload> =
  object({
    title: string().trim().required(),
    description: string().trim().required(),
    sentAt: dateString.nullable().defined()
  });
