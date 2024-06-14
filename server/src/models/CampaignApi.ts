import fp from 'lodash/fp';

import { CampaignDTO } from '@zerologementvacant/models';
import { Sort } from './SortApi';

export interface CampaignApi extends CampaignDTO {
  userId: string;
  establishmentId: string;
  groupId?: string;
}

export function toCampaignDTO(campaign: CampaignApi): CampaignDTO {
  return fp.pick(
    [
      'id',
      'title',
      'status',
      'filters',
      'file',
      'createdAt',
      'validatedAt',
      'exportedAt',
      'sentAt',
      'archivedAt',
      'confirmedAt',
      'groupId',
    ],
    campaign,
  );
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
