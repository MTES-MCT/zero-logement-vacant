import { isDefined, isUndefined } from '@zerologementvacant/shared';
import { OwnerApi } from './OwnerApi';
import { compare, includeSameMembers } from '~/utils/compareUtils';
import { HousingRecordApi } from './HousingApi';

export const MAX_OWNERS = 6;

export interface HousingOwnerApi extends OwnerApi {
  ownerId: string;
  housingId: string;
  housingGeoCode: string;
  /**
   * Should be come `rank: Rank`
   */
  rank: number;
  startDate?: Date;
  endDate?: Date;
  origin?: string;
  /**
   * @deprecated Hard to maintain because it is computed from the housings
   */
  housingCount?: number;
  // New properties
  idprocpte?: string;
  idprodroit?: string;
  locprop?: number;
}

type Incorrect = -1;
type Awaiting = -2;
export const POSITIVE_RANKS = [1, 2, 3, 4, 5, 6] as const;
export type PositiveRank = (typeof POSITIVE_RANKS)[number];
export type Rank = Incorrect | Awaiting | PositiveRank;
export function isIncorrect(rank: Rank): rank is Incorrect {
  return rank === -1;
}
export function isAwaiting(rank: Rank): rank is Awaiting {
  return rank === -2;
}

export function toHousingOwnersApi(
  housing: HousingRecordApi,
  owners: OwnerApi[]
): HousingOwnerApi[] {
  return owners.map((owner, i) => ({
    ...owner,
    ownerId: owner.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    rank: i + 1,
    startDate: new Date()
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
