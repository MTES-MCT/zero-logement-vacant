import { normalizeUrlSegment } from '../utils/fetchUtils';
import { EstablishmentDTO } from '../../../shared/models/EstablishmentDTO';

export type Establishment = Omit<EstablishmentDTO, 'priority'>;

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
