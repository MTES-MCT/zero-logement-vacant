import { HousingFiltersApi } from './HousingFiltersApi';

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
