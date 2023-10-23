import { OwnerApi } from './OwnerApi';
import { compare, includeSameMembers } from '../utils/compareUtils';
import { HousingApi } from './HousingApi';

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
  housing: HousingApi,
  owners: OwnerApi[]
): HousingOwnerApi[] {
  return owners.map((owner, i) => ({
    ...owner,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    rank: i + 1,
  }));
}

export function equals(a: HousingOwnerApi, b: HousingOwnerApi): boolean {
  return (
    Object.values(compare(a, b, ['id', 'housingId', 'housingGeoCode', 'rank']))
      .length === 0
  );
}

export const includeSameHousingOwners = includeSameMembers(equals);
