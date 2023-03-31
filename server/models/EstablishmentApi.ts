import { EstablishmentKind } from '../../shared/types/EstablishmentKind';

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

export function hasPriority(establishment: EstablishmentApi): boolean {
  return establishment.campaignIntent === '0-2';
}

export type CampaignIntent = '0-2' | '2-4' | '4+';

export const INTENTS: CampaignIntent[] = ['0-2', '2-4', '4+'];

export interface EstablishmentDataApi {
  id: string;
  name: string;
  housingCount: number;
  firstActivatedAt: Date;
  lastAuthenticatedAt: Date;
  lastMonthUpdatesCount: number;
  campaignsCount: number;
  contactedHousingCount: number;
  contactedHousingPerCampaign: number;
  firstCampaignSendingDate: Date;
  lastCampaignSendingDate: Date;
  delayBetweenCampaigns: any;
  firstCampaignSentDelay: number;
}
