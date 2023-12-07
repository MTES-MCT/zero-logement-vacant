import { OwnerApi } from './OwnerApi';
import { compare, includeSameMembers } from '../utils/compareUtils';
import { HousingRecordApi } from './HousingApi';
import { isDefined, isUndefined } from '../../shared';

export const MAX_OWNERS = 6;

export interface HousingOwnerApi extends OwnerApi {
  housingId: string;
  housingGeoCode: string;
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  housingCount?: number;
}

export function toHousingOwnersApi(
  housing: HousingRecordApi,
  owners: OwnerApi[]
): HousingOwnerApi[] {
  return owners.map((owner, i) => ({
    ...owner,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    rank: i + 1,
    startDate: new Date(),
  }));
}

export function compareHousingOwners(
  a: HousingOwnerApi,
  b: HousingOwnerApi
): Partial<HousingOwnerApi> {
  return compare(a, b, ['id', 'housingId', 'housingGeoCode', 'rank']);
}

export function equals(a?: HousingOwnerApi, b?: HousingOwnerApi): boolean {
  if ([a, b].every(isUndefined)) {
    return true;
  }

  return (
    isDefined(a) &&
    isDefined(b) &&
    Object.values(compareHousingOwners(a, b)).length === 0
  );
}

export const includeSameHousingOwners = includeSameMembers(equals);
