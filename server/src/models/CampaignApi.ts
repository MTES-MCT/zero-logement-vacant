import { CampaignDTO } from '@zerologementvacant/models';
import { Struct } from 'effect';

import { Sort } from './SortApi';

export interface CampaignApi extends CampaignDTO {
  userId: string;
  establishmentId: string;
  groupId?: string;
}

export function toCampaignDTO(campaign: CampaignApi): CampaignDTO {
  return Struct.pick(
    campaign,
    'id',
    'title',
    'description',
    'status',
    'filters',
    'file',
    'createdAt',
    'validatedAt',
    'exportedAt',
    'sentAt',
    'archivedAt',
    'confirmedAt',
    'groupId'
  );
}

export enum CampaignSteps {
  OwnersValidation,
  Export,
  Sending,
  Confirmation,
  InProgess,
  Outside,
  Archived
}

export type CampaignSortableApi = Pick<
  CampaignApi,
  'title' | 'createdAt' | 'sentAt'
> & {
  status: string;
};
export type CampaignSortApi = Sort<CampaignSortableApi>;
