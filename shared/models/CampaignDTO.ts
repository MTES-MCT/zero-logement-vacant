import { HousingFiltersDTO } from './HousingFiltersDTO';

export interface CampaignDTO {
  id: string;
  title: string;
  status: CampaignStatus;
  filters: HousingFiltersDTO;
  createdAt: string;
  validatedAt?: string;
  exportedAt?: string;
  sentAt?: string;
  archivedAt?: string;
  sendingDate?: string;
  confirmedAt?: string;
}

export type CampaignStatus =
  | 'draft'
  | 'validating'
  | 'sending'
  | 'in-progress'
  | 'archived';

export interface CampaignPayloadDTO extends Pick<CampaignDTO, 'title'> {
  housing: {
    all: boolean;
    ids: string[];
    filters: HousingFiltersDTO;
  };
}
