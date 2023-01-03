export interface EstablishmentApi {
  id: string;
  name: string;
  siren: number;
  available: boolean;
  localities: LocalityApi[];
  campaignIntent?: CampaignIntent;
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

export interface LocalityApi {
  id: string;
  geoCode: string;
  name: string;
}
