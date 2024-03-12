import { Sort } from './SortApi';

export interface CampaignApi {
  id: string;
  establishmentId: string;
  title: string;
  status: CampaignStatus;
  createdBy: string;
  createdAt: Date;
  validatedAt?: Date;
  exportedAt?: Date;
  sentAt?: Date;
  archivedAt?: Date;
  sendingDate?: Date;
  confirmedAt?: Date;
  groupId?: string;
}

export type CampaignStatus = 'draft' | 'validating' | 'sending' | 'in-progress';

export enum CampaignSteps {
  OwnersValidation,
  Export,
  Sending,
  Confirmation,
  InProgess,
  Outside,
  Archived,
}

export type CampaignSortableApi = Pick<
  CampaignApi,
  'createdAt' | 'sendingDate'
> & { status: string };
export type CampaignSortApi = Sort<CampaignSortableApi>;
