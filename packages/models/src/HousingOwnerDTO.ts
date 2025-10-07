import { HousingDTO } from './HousingDTO';
import { OwnerDTO } from './OwnerDTO';
import { PropertyRight } from './PropertyRight';

export interface BaseHousingOwnerDTO {
  rank: OwnerRank;
  idprocpte: string | null;
  idprodroit: string | null;
  locprop: number | null;
  propertyRight: PropertyRight | null;
}

export type HousingOwnerDTO = BaseHousingOwnerDTO & OwnerDTO;
export type OwnerHousingDTO = BaseHousingOwnerDTO & HousingDTO;

export type HousingOwnerPayloadDTO = BaseHousingOwnerDTO & Pick<OwnerDTO, 'id'>;

export const AWAITING_OWNER_RANK = -2 as const;
export const INCORRECT_OWNER_RANK = -1 as const;
export const PREVIOUS_OWNER_RANK = 0 as const;
export const INACTIVE_OWNER_RANKS = [
  AWAITING_OWNER_RANK,
  INCORRECT_OWNER_RANK,
  PREVIOUS_OWNER_RANK
] as const;
export const ACTIVE_OWNER_RANKS = [1, 2, 3, 4, 5, 6] as const;
export const OWNER_RANKS = [
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

export function isPrimaryOwner(
  housingOwner: Pick<HousingOwnerDTO, 'rank'>
): boolean {
  return housingOwner.rank === 1;
}

export function isSecondaryOwner(
  housingOwner: Pick<HousingOwnerDTO, 'rank'>
): boolean {
  return housingOwner.rank >= 2;
}
