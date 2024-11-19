import { EstablishmentDTO } from '@zerologementvacant/models';

export interface EstablishmentApi extends EstablishmentDTO {
  campaignIntent?: CampaignIntent;
  priority: EstablishmentPriority;
}

export type EstablishmentPriority = 'standard' | 'high';

export function hasPriority(
  establishment: Pick<EstablishmentApi, 'campaignIntent'>
): boolean {
  return establishment.campaignIntent === '0-2';
}

export type CampaignIntent = '0-2' | '2-4' | '4+';

export const INTENTS: CampaignIntent[] = ['0-2', '2-4', '4+'];
