import { EstablishmentKind } from '../../../shared/types/EstablishmentKind';

export interface Establishment {
  id: string;
  name: string;
  siren: number;
  campaignIntent?: string;
  kind: EstablishmentKind;
  geoCodes: string[];
}

export interface EstablishmentData {
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
