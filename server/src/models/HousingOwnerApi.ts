import { HousingOwnerDTO } from '@zerologementvacant/models';
import { isDefined, isUndefined } from '@zerologementvacant/utils';
import { compare, includeSameMembers } from '~/utils/compareUtils';
import { HousingRecordApi } from './HousingApi';
import { OwnerApi, toOwnerDTO } from './OwnerApi';

export const MAX_OWNERS = 6;

export interface HousingOwnerApi extends OwnerApi {
  ownerId: string;
  housingId: string;
  housingGeoCode: string;
  /**
   * Should be come `rank: Rank`
   */
  rank: OwnerRank;
  startDate?: Date | null;
  endDate?: Date | null;
  origin?: string;
  /**
   * @deprecated Hard to maintain because it is computed from the housings
   */
  housingCount?: number;
  // New properties
  idprocpte?: string | null;
  idprodroit?: string | null;
  locprop?: number | null;
}

export const AWAITING_OWNER_RANK = -2 as const;
export const INCORRECT_OWNER_RANK = -1 as const;
export const PREVIOUS_OWNER_RANK = 0 as const;
export const INACTIVE_OWNER_RANKS = [
  AWAITING_OWNER_RANK,
  INCORRECT_OWNER_RANK,
  PREVIOUS_OWNER_RANK
] as const;
export const ACTIVE_OWNER_RANKS = [1, 2, 3, 4, 5, 6] as const;
export const HOUSING_OWNER_RANKS = [
  AWAITING_OWNER_RANK,
  INCORRECT_OWNER_RANK,
  PREVIOUS_OWNER_RANK,
  ...ACTIVE_OWNER_RANKS
] as const;

export type AwaitingOwnerRank = typeof AWAITING_OWNER_RANK;
export type IncorrectOwnerRank = typeof INCORRECT_OWNER_RANK;
export type PreviousOwnerRank = typeof PREVIOUS_OWNER_RANK;
export type ActiveOwnerRank = (typeof ACTIVE_OWNER_RANKS)[number];
export type InactiveOwnerRank =
  | AwaitingOwnerRank
  | IncorrectOwnerRank
  | PreviousOwnerRank;
export type OwnerRank = InactiveOwnerRank | ActiveOwnerRank;
export function isActiveOwnerRank(rank: OwnerRank): rank is ActiveOwnerRank {
  return 1 <= rank && rank <= 6;
}
export function isPreviousOwnerRank(
  rank: OwnerRank
): rank is PreviousOwnerRank {
  return rank === 0;
}
export function isIncorrectOwnerRank(
  rank: OwnerRank
): rank is IncorrectOwnerRank {
  return rank === -1;
}
export function isAwaitingOwnerRank(
  rank: OwnerRank
): rank is AwaitingOwnerRank {
  return rank === -2;
}
export function isInactiveOwnerRank(
  rank: OwnerRank
): rank is InactiveOwnerRank {
  return (
    isPreviousOwnerRank(rank) ||
    isIncorrectOwnerRank(rank) ||
    isAwaitingOwnerRank(rank)
  );
}

/**
 * @deprecated
 * @param housing
 * @param owners
 */
export function toHousingOwnersApi(
  housing: HousingRecordApi,
  owners: OwnerApi[]
): HousingOwnerApi[] {
  return owners.map((owner, i) => ({
    ...owner,
    ownerId: owner.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
    rank: (i + 1) as OwnerRank,
    startDate: new Date()
  }));
}

export function toHousingOwnerDTO(
  housingOwner: HousingOwnerApi
): HousingOwnerDTO {
  return {
    ...toOwnerDTO(housingOwner),
    id: housingOwner.ownerId,
    rank: housingOwner.rank,
    idprocpte: housingOwner.idprocpte ?? null,
    idprodroit: housingOwner.idprodroit ?? null,
    locprop: housingOwner.locprop ?? null
  };
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
