import { HousingFiltersDTO } from './HousingFiltersDTO';

export interface CampaignDTO {
  id: string;
  title: string;
  status: CampaignStatus;
  filters: HousingFiltersDTO;
  file?: string;
  createdAt: string;
  validatedAt?: string;
  exportedAt?: string;
  sentAt?: string;
  archivedAt?: string;
  /**
   * @deprecated
   */
  sendingDate?: string;
  confirmedAt?: string;
  groupId?: string;
}

export type CampaignStatus = 'draft' | 'sending' | 'in-progress' | 'archived';
export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'draft',
  'sending',
  'in-progress',
  'archived'
];
export function nextStatus(current: CampaignStatus): CampaignStatus | null {
  if (current === 'archived') {
    return null;
  }
  return CAMPAIGN_STATUSES[CAMPAIGN_STATUSES.indexOf(current) + 1];
}

export interface CampaignCreationPayloadDTO extends Pick<CampaignDTO, 'title'> {
  housing: {
    all: boolean;
    ids: string[];
    filters: HousingFiltersDTO;
  };
}

export interface CampaignUpdatePayloadDTO
  extends Pick<CampaignDTO, 'title' | 'status' | 'file'> {
  sentAt?: string;
}
