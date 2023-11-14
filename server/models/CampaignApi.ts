import { HousingFiltersApi } from './HousingFiltersApi';
import { Sort } from './SortApi';

export interface CampaignApi {
  id: string;
  establishmentId: string;
  filters: HousingFiltersApi;
  title: string;
  createdBy?: string;
  createdAt?: Date;
  validatedAt?: Date;
  exportedAt?: Date;
  sentAt?: Date;
  archivedAt?: Date;
  sendingDate?: Date;
  confirmedAt?: Date;
  groupId?: string;
}

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
