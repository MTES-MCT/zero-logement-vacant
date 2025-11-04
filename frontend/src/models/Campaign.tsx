import { dateSort } from '../utils/dateUtils';
import type { Sort } from './Sort';
import type { CampaignDTO, CampaignStatus } from '@zerologementvacant/models';

export interface Campaign extends CampaignDTO {
  exportURL: string;
  groupId?: string;
}

export const CampaignSteps = {
  OwnersValidation: 0,
  Export: 1,
  Sending: 2,
  Confirmation: 3,
  InProgress: 4,
  Outside: 5,
  Archived: 6
} as const;

export type CampaignSteps = (typeof CampaignSteps)[keyof typeof CampaignSteps];

export function isBuilding(campaign: Campaign) {
  const statuses: CampaignStatus[] = ['draft', 'sending'];
  return statuses.includes(campaign.status);
}

export const campaignStep = (campaign: Campaign) => {
  return !campaign?.validatedAt
    ? CampaignSteps.OwnersValidation
    : !campaign?.exportedAt
      ? CampaignSteps.Export
      : !campaign?.sentAt
        ? CampaignSteps.Sending
        : campaign?.archivedAt
          ? CampaignSteps.Archived
          : !campaign?.confirmedAt
            ? CampaignSteps.Confirmation
            : CampaignSteps.InProgress;
};

export type CampaignSortable = Pick<
  Campaign,
  'title' | 'createdAt' | 'sentAt'
> & {
  status: string;
};
export type CampaignSort = Sort<CampaignSortable>;

export function isCampaignSortable(key: string): key is keyof CampaignSortable {
  return ['title', 'status', 'createdAt', 'sentAt'].includes(key);
}

export const campaignSort = (c1: Campaign, c2: Campaign) =>
  dateSort(new Date(c2.createdAt), new Date(c1.createdAt));

export const isCampaignDeletable = (campaign: Campaign) =>
  campaign.status !== 'archived';
