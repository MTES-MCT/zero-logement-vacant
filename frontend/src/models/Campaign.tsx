import { dateSort } from '../utils/dateUtils';
import { Sort } from './Sort';
import { CampaignDTO, CampaignStatus } from '../../../shared';

export interface Campaign extends CampaignDTO {
  exportURL: string;
  groupId?: string;
}

export enum CampaignSteps {
  OwnersValidation,
  Export,
  Sending,
  Confirmation,
  InProgress,
  Outside,
  Archived,
}

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

export type CampaignSortable = Pick<Campaign, 'createdAt' | 'sentAt'> & {
  status: string;
};
export type CampaignSort = Sort<CampaignSortable>;

export const campaignSort = (c1: Campaign, c2: Campaign) =>
  dateSort(new Date(c2.createdAt), new Date(c1.createdAt));

export const isCampaignDeletable = (campaign: Campaign) =>
  campaign.status !== 'archived';
