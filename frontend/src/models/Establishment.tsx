export interface Establishment {
  id: string;
  name: string;
  siren: number;
  localities: {
    geoCode: string;
    name: string;
  }[];
  campaignIntent?: string;
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

export enum LocalityKinds {
  ACV = 'ACV',
  PVD = 'PVD',
}

export const LocalityKindLabels = {
  [LocalityKinds.ACV]: 'Action Cœur de Ville',
  [LocalityKinds.PVD]: 'Petites Villes de Demain',
};
