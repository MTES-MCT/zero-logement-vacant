import { OwnerApi } from './OwnerApi';
import { HousingOwnerApi } from './HousingOwnerApi';
import { MarkRequired } from 'ts-essentials';

export interface ConflictApi<T> {
  id: string;
  existing?: T;
  replacement?: T;
  createdAt: Date;
}

export type OwnerConflictApi = MarkRequired<
  ConflictApi<OwnerApi>,
  'existing' | 'replacement'
>;
export interface HousingOwnerConflictApi extends ConflictApi<HousingOwnerApi> {
  // Should always be linked to a housing
  housingGeoCode: string;
  housingId: string;
}
