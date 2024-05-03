import { Sort } from './SortApi';
import { CampaignDTO } from '@zerologementvacant/models';

export interface CampaignApi extends CampaignDTO {
  userId: string;
  establishmentId: string;
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

export type CampaignSortableApi = Pick<CampaignApi, 'createdAt' | 'sentAt'> & {
  status: string;
};
export type CampaignSortApi = Sort<CampaignSortableApi>;
