import { assert } from 'ts-essentials';

import {
  EventCategory,
  EventKind,
  EventSection
} from '@zerologementvacant/shared';
import { HousingApi } from './HousingApi';
import { OwnerApi } from './OwnerApi';
import { CampaignApi } from './CampaignApi';
import { GroupApi } from './GroupApi';
import { UserApi } from '~/models/UserApi';

export interface EventApi<T> {
  id: string;
  name: string;
  kind: EventKind;
  category: EventCategory;
  section: EventSection;
  conflict?: boolean;
  old?: T;
  new?: T;
  createdAt: Date;
  createdBy: string;
  creator?: UserApi;
}

export interface HousingEventApi extends EventApi<HousingApi> {
  housingId: string;
  housingGeoCode: string;
}

export interface OwnerEventApi extends EventApi<OwnerApi> {
  ownerId: string;
}

export interface CampaignEventApi extends EventApi<CampaignApi> {
  campaignId: string;
}

export interface GroupHousingEventApi extends EventApi<GroupApi> {
  housingId: string;
  housingGeoCode: string;
  groupId: string | null;
}

export function isUserModified<T>(event: EventApi<T>): boolean {
  assert(event.creator, 'Event creator is missing');
  const isBeta = /@(zerologementvacant\.)?beta\.gouv\.fr$/;
  return !isBeta.test(event.creator.email);
}
