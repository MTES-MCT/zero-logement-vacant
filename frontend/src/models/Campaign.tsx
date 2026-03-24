import type { CampaignDTO, CampaignStatus } from '@zerologementvacant/models';

import type { Group } from '~/models/Group';
import type { Sort } from '~/models/Sort';
import { dateSort } from '~/utils/dateUtils';

export interface Campaign extends CampaignDTO {
  /**
   * @deprecated
   */
  exportURL: string;
  groupId?: Group['id'];
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
  | 'title'
  | 'createdAt'
  | 'sentAt'
  | 'housingCount'
  | 'ownerCount'
  | 'returnCount'
  | 'returnRate'
> & {
  status: string;
};
export type CampaignSort = Sort<CampaignSortable>;

export function isCampaignSortable(key: string): key is keyof CampaignSortable {
  return [
    'title',
    'status',
    'createdAt',
    'sentAt',
    'housingCount',
    'ownerCount',
    'returnCount',
    'returnRate'
  ].includes(key);
}

export const campaignSort = (c1: Campaign, c2: Campaign) =>
  dateSort(new Date(c2.createdAt), new Date(c1.createdAt));

export const isCampaignDeletable = (campaign: Campaign) =>
  campaign.status !== 'archived';

export function fromCampaignDTO(campaign: CampaignDTO): Campaign {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    groupId: campaign.groupId,
    createdAt: campaign.createdAt,
    createdBy: campaign.createdBy,
    validatedAt: campaign.validatedAt,
    exportedAt: campaign.exportedAt,
    sentAt: campaign.sentAt,
    confirmedAt: campaign.confirmedAt,
    archivedAt: campaign.archivedAt,
    status: campaign.status,
    filters: campaign.filters,
    file: campaign.file,
    returnCount: campaign.returnCount,
    returnRate: campaign.returnRate,
    housingCount: campaign.housingCount,
    ownerCount: campaign.ownerCount,
    // TODO: fix this
    exportURL: ''
  };
}
