import { HousingFilters } from './HousingFilters';
import { dateSort } from '../utils/dateUtils';
import { Sort } from './Sort';

export interface DraftCampaign {
  filters: HousingFilters;
  title?: string;
}

export interface Campaign {
  id: string;
  filters: HousingFilters;
  title: string;
  createdAt: Date;
  validatedAt?: Date;
  exportedAt?: Date;
  sentAt?: Date;
  archivedAt?: Date;
  sendingDate?: Date;
  confirmedAt?: Date;
  exportURL: string;
  groupId: string;
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

export interface CampaignUpdate {
  titleUpdate?: Pick<Campaign, 'title'>;
  stepUpdate?: { step: CampaignSteps } & Pick<Campaign, 'sendingDate'>;
}

export type CampaignSortable = Pick<Campaign, 'createdAt' | 'sendingDate'> & {
  status: string;
};
export type CampaignSort = Sort<CampaignSortable>;

export const campaignSort = (c1: Campaign, c2: Campaign) =>
  dateSort(c2.createdAt, c1.createdAt);

export const isCampaignDeletable = (campaign: Campaign) =>
  !!campaign && campaignStep(campaign) !== CampaignSteps.Archived;
