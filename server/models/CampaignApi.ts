import { HousingFiltersApi } from './HousingFiltersApi';
import { formatISO } from 'date-fns';
import { GroupApi } from './GroupApi';

export interface CampaignApi {
  id: string;
  establishmentId: string;
  campaignNumber: number;
  kind: CampaignKinds;
  reminderNumber: number;
  filters: HousingFiltersApi;
  title?: string;
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

export interface CampaignBundleApi {
  campaignIds: string[];
  campaignNumber: number;
  reminderNumber: number;
  createdAt: Date;
  kind: CampaignKinds;
  filters: HousingFiltersApi;
  title?: string;
  housingCount: number;
  neverContactedCount: number;
  waitingCount: number;
  inProgressCount: number;
  notVacantCount: number;
  noActionCount: number;
  npaiCount: number;
  inProgressWithSupportCount: number;
  ownerCount: number;
  group?: GroupApi;
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

export enum CampaignKinds {
  Initial,
  Surveying,
  DoorToDoor,
  BeforeZlv,
}

export const DefaultCampaign = {
  campaignNumber: 0,
  filters: {},
  createdAt: new Date(),
  validatedAt: new Date(),
  exportedAt: new Date(),
  sentAt: new Date(),
  sendingDate: formatISO(new Date()),
};
