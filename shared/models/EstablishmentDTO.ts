import { EstablishmentKind } from '../types/EstablishmentKind';

export interface EstablishmentDTO {
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

export type CampaignIntent = '0-2' | '2-4' | '4+';
