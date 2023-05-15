import { EventKind } from '../../shared/types/EventKind';
import { EventCategory } from '../../shared/types/EventCategory';
import { HousingApi } from './HousingApi';
import { HousingOwnerApi, OwnerApi } from './OwnerApi';
import { CampaignApi } from './CampaignApi';
import { EventSection } from '../../shared/types/EventSection';

export interface EventApi<T> {
  id: string;
  name: string;
  kind: EventKind;
  category: EventCategory;
  section: EventSection;
  contactKind?: string;
  conflict?: boolean;
  old?: T;
  new?: T;
  createdAt: Date;
  createdBy: string;
}

export interface HousingEventApi
  extends EventApi<HousingApi | HousingOwnerApi[]> {
  housingId: string;
}
export interface OwnerEventApi extends EventApi<OwnerApi> {
  ownerId: string;
}
export interface CampaignEventApi extends EventApi<CampaignApi> {
  campaignId: string;
}
