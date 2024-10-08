import { HousingFiltersDTO } from './HousingFiltersDTO';

export interface CampaignDTO {
  id: string;
  title: string;
  description: string;
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

export const CAMPAIGN_STATUS_VALUES = [
  'draft',
  'sending',
  'in-progress',
  'archived'
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUS_VALUES)[number];
export function nextStatus(current: CampaignStatus): CampaignStatus | null {
  if (current === 'archived') {
    return null;
  }
  return CAMPAIGN_STATUS_VALUES[CAMPAIGN_STATUS_VALUES.indexOf(current) + 1];
}

export interface CampaignCreationPayloadDTO
  extends Pick<CampaignDTO, 'title' | 'description'> {
  housing: {
    all: boolean;
    ids: string[];
    filters: HousingFiltersDTO;
  };
}

export interface CampaignUpdatePayloadDTO
  extends Pick<CampaignDTO, 'title' | 'description' | 'status' | 'file'> {
  sentAt?: string;
}
