import { EstablishmentKind } from '../../../shared/types/EstablishmentKind';
import { normalizeUrlSegment } from '../utils/fetchUtils';

export interface Establishment {
  id: string;
  name: string;
  shortName: string;
  siren: number;
  available: boolean;
  geoCodes: string[];
  campaignIntent?: string;
  kind: EstablishmentKind;
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

export const getEstablishmentUrl = (establishment: Establishment) =>
  establishment.kind === 'Commune'
    ? `/communes/${normalizeUrlSegment(establishment.shortName)}-${
        establishment.geoCodes[0]
      }`
    : `/collectivites/${normalizeUrlSegment(establishment.shortName)}`;
