import { EventKind } from '../../shared/types/EventKind';
import { EventCategory } from '../../shared/types/EventCategory';
import { HousingApi } from './HousingApi';
import { OwnerApi } from './OwnerApi';
import { CampaignApi } from './CampaignApi';
import { EventSection } from '../../shared/types/EventSection';
import { GroupApi } from './GroupApi';
import { HousingOwnerApi } from './HousingOwnerApi';

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
}

export interface HousingEventApi
  extends EventApi<HousingApi | HousingOwnerApi[]> {
  housingId: string;
  housingGeoCode: string;
}

export interface OwnerEventApi extends EventApi<OwnerApi> {
  ownerId: string;
}

export interface CampaignEventApi extends EventApi<CampaignApi> {
  campaignId: string;
}

export interface CampaignHousingEventApi extends EventApi<CampaignApi> {
  campaignId: string | null;
  housingId: string;
  housingGeoCode: string;
}

export interface GroupHousingEventApi extends EventApi<GroupApi> {
  housingId: string;
  housingGeoCode: string;
  groupId: string | null;
}

export function isHousingEvent(
  event: EventApi<unknown>
): event is HousingEventApi {
  return 'housingId' in event;
}
