import { contramap, DEFAULT_ORDER, Ord } from '@zerologementvacant/utils';
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
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Envoi en attente',
  sending: 'En cours d’envoi',
  'in-progress': 'Envoyée',
  archived: 'Archivée'
};

export type CampaignStatus = (typeof CAMPAIGN_STATUS_VALUES)[number];
export function nextStatus(current: CampaignStatus): CampaignStatus | null {
  if (current === 'archived') {
    return null;
  }
  return CAMPAIGN_STATUS_VALUES[CAMPAIGN_STATUS_VALUES.indexOf(current) + 1];
}
export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return (
    typeof value === 'string' &&
    CAMPAIGN_STATUS_VALUES.includes(value as CampaignStatus)
  );
}

export const byTitle: Ord<CampaignDTO> = contramap(
  (campaign: CampaignDTO) => campaign.title
)(DEFAULT_ORDER);

export const byStatus: Ord<CampaignDTO> = contramap((campaign: CampaignDTO) =>
  CAMPAIGN_STATUS_VALUES.indexOf(campaign.status)
)(DEFAULT_ORDER);

export const byCreatedAt: Ord<CampaignDTO> = contramap(
  (campaign: CampaignDTO) => new Date(campaign.createdAt)
)(DEFAULT_ORDER);

export const bySentAt: Ord<CampaignDTO> = contramap(
  (campaign: CampaignDTO) => campaign.sentAt
)(DEFAULT_ORDER);

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

export interface CampaignRemovalPayloadDTO {
  all: boolean;
  ids: string[];
  filters: HousingFiltersDTO;
}
