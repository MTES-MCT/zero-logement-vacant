import { EstablishmentKind } from '@zerologementvacant/shared';

export interface EstablishmentApi {
  id: string;
  name: string;
  shortName: string;
  siren: number;
  available: boolean;
  geoCodes: string[];
  campaignIntent?: CampaignIntent;
  priority: EstablishmentPriority;
  kind: EstablishmentKind;
}

export type EstablishmentPriority = 'standard' | 'high';

export function hasPriority(
  establishment: Pick<EstablishmentApi, 'campaignIntent'>,
): boolean {
  return establishment.campaignIntent === '0-2';
}

export type CampaignIntent = '0-2' | '2-4' | '4+';

export const INTENTS: CampaignIntent[] = ['0-2', '2-4', '4+'];
