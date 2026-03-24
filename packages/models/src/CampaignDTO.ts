import { Order } from 'effect';

import { HousingFiltersDTO } from './HousingFiltersDTO';
import type { UserDTO } from './UserDTO';

export interface CampaignDTO {
  id: string;
  title: string;
  description: string;
  /**
   * @deprecated Status will be unnecessary.
   */
  status: CampaignStatus;
  /**
   * @deprecated
   */
  filters: HousingFiltersDTO;
  /**
   * @deprecated
   */
  file?: string;
  createdAt: string;
  createdBy: UserDTO;
  /**
   * @deprecated
   */
  validatedAt?: string;
  exportedAt?: string;
  /**
   * `sentAt` should become `string | null`.
   */
  sentAt?: string | null;
  /**
   * @deprecated
   */
  archivedAt?: string;
  /**
   * @deprecated
   */
  sendingDate?: string;
  /**
   * @deprecated
   */
  confirmedAt?: string;
  groupId?: string;
  returnCount: number | null;
  // New fields
  returnRate: number | null;
  housingCount: number;
  ownerCount: number;
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

export const byTitle: Order.Order<CampaignDTO> = Order.mapInput(
  Order.string,
  (campaign) => campaign.title
);

export const byStatus: Order.Order<CampaignDTO> = Order.mapInput(
  Order.number,
  (campaign) => CAMPAIGN_STATUS_VALUES.indexOf(campaign.status)
);

export const byCreatedAt: Order.Order<CampaignDTO> = Order.mapInput(
  Order.Date,
  (campaign) => new Date(campaign.createdAt)
);

export const bySentAt: Order.Order<CampaignDTO> = Order.mapInput(
  Order.string,
  (campaign) => campaign.sentAt ?? ''
);

export const byHousingCount: Order.Order<CampaignDTO> = Order.mapInput(
  Order.number,
  (campaign) => campaign.housingCount
);

export const byOwnerCount: Order.Order<CampaignDTO> = Order.mapInput(
  Order.number,
  (campaign) => campaign.ownerCount
);

export const byReturnCount: Order.Order<CampaignDTO> = Order.mapInput(
  Order.number,
  (campaign) => campaign.returnCount ?? 0
);

export const byReturnRate: Order.Order<CampaignDTO> = Order.mapInput(
  Order.number,
  (campaign) => campaign.returnRate ?? 0
);

export interface CampaignCreationPayloadDTO
  extends Pick<CampaignDTO, 'title' | 'description' | 'sentAt'> {
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

export type CampaignPayload = {
  title: string;
  description: string;
  sentAt: string | null;
};

export type CampaignCreationPayload = CampaignPayload;

export type CampaignUpdatePayload = CampaignPayload;

export interface CampaignRemovalPayloadDTO {
  all: boolean;
  ids: string[];
  filters: HousingFiltersDTO;
}
