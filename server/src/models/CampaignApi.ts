import { CampaignDTO, type EstablishmentDTO } from '@zerologementvacant/models';
import { Struct } from 'effect';

import { Sort } from './SortApi';
import { fromUserDTO } from './UserApi';

export interface CampaignApi extends CampaignDTO {
  userId: string;
  establishmentId: string;
  groupId?: string;
}

export function fromCampaignDTO(
  campaign: CampaignDTO,
  establishment: EstablishmentDTO
): CampaignApi {
  return {
    ...Struct.pick(
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
      'groupId',
      'returnCount',
      'returnRate',
      'housingCount',
      'ownerCount'
    ),
    createdBy: fromUserDTO(campaign.createdBy),
    userId: campaign.createdBy.id,
    establishmentId: establishment.id
  };
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
    'createdBy',
    'validatedAt',
    'exportedAt',
    'sentAt',
    'archivedAt',
    'confirmedAt',
    'groupId',
    'returnCount',
    'returnRate',
    'housingCount',
    'ownerCount'
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
