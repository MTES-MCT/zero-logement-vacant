import {
  AWAITING_OWNER_RANK,
  DECEASED_OWNER_RANK,
  INCORRECT_OWNER_RANK,
  isActiveOwnerRank,
  isInactiveOwnerRank,
  type OwnerRank,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import { Array, pipe } from 'effect';
import { match, Pattern } from 'ts-pattern';
import type { HousingOwner, Owner } from './Owner';

export type OwnerRankLabel =
  | 'primary'
  | 'secondary'
  | 'previous'
  | 'incorrect'
  | 'deceased'
  | 'awaiting';

/**
 * Converts a numeric owner rank to a label string
 */
export function rankToLabel(rank: OwnerRank): OwnerRankLabel {
  return match(rank)
    .with(1, () => 'primary' as const)
    .with(2, 3, 4, 5, 6, () => 'secondary' as const)
    .with(Pattern.number.int().gte(7), () => 'secondary' as const)
    .with(PREVIOUS_OWNER_RANK, () => 'previous' as const)
    .with(INCORRECT_OWNER_RANK, () => 'incorrect' as const)
    .with(AWAITING_OWNER_RANK, () => 'awaiting' as const)
    .with(DECEASED_OWNER_RANK, () => 'deceased' as const)
    .exhaustive();
}

/**
 * Converts a label string to a numeric owner rank
 * For secondary owners, returns 2 as the default (will need adjustment in context)
 */
export function labelToRank(label: OwnerRankLabel): OwnerRank {
  return match(label)
    .with('primary', () => 1 as const)
    .with('secondary', () => 2 as const)
    .with('previous', () => PREVIOUS_OWNER_RANK)
    .with('incorrect', () => INCORRECT_OWNER_RANK)
    .with('awaiting', () => AWAITING_OWNER_RANK)
    .with('deceased', () => DECEASED_OWNER_RANK)
    .exhaustive();
}

/**
 * Checks if a rank label represents an active owner
 */
export function isActiveRankLabel(label: OwnerRankLabel): boolean {
  return label === 'primary' || label === 'secondary';
}

/**
 * Checks if a rank label represents an inactive owner
 */
export function isInactiveRankLabel(label: OwnerRankLabel): boolean {
  return !isActiveRankLabel(label);
}

export interface RankTransition {
  id: Owner['id'];
  from: OwnerRankLabel;
  to: OwnerRankLabel;
}

/**
 * Computes the new list of housing owners after a rank transition.
 * This function handles all rank change scenarios including:
 * - Promoting an owner to primary (demotes current primary to secondary)
 * - Demoting primary to secondary (rebuilds secondary ranks)
 * - Moving between active and inactive states
 * - Swapping ranks between owners
 */
export function computeOwnersAfterRankTransition(
  owners: ReadonlyArray<HousingOwner>,
  transition: RankTransition
): ReadonlyArray<HousingOwner> {
  const activeOwners = owners.filter(({ rank }) => isActiveOwnerRank(rank));
  const inactiveOwners = owners.filter(({ rank }) => isInactiveOwnerRank(rank));
  const selectedOwner = owners.find((owner) => owner.id === transition.id);

  if (!selectedOwner) {
    return owners;
  }

  return match(transition)
    .with({ from: 'secondary', to: 'primary' }, () => {
      return [
        { ...selectedOwner, rank: 1 as const },
        ...activeOwners
          .filter((owner) => owner.id !== selectedOwner.id)
          .map((owner, index) => ({
            ...owner,
            rank: (2 + index) as OwnerRank
          })),
        ...inactiveOwners
      ];
    })
    .with({ from: 'primary', to: 'secondary' }, () => {
      return activeOwners
        .map((owner, index) => ({
          ...owner,
          // Rebuild secondary owner ranks
          rank: (2 + index) as OwnerRank
        }))
        .concat(inactiveOwners);
    })
    .with(
      {
        from: Pattern.union('previous', 'incorrect', 'awaiting', 'deceased'),
        to: 'primary'
      },
      () => {
        return pipe(
          activeOwners,
          Array.map((housingOwner, index) => ({
            ...housingOwner,
            rank: (2 + index) as OwnerRank
          })),
          Array.prepend({ ...selectedOwner, rank: 1 as const }),
          Array.appendAll(
            inactiveOwners.filter(
              (inactiveOwner) => inactiveOwner.id !== selectedOwner.id
            )
          )
        );
      }
    )
    .with(
      {
        from: Pattern.union('previous', 'incorrect', 'awaiting', 'deceased'),
        to: 'secondary'
      },
      () => {
        return pipe(
          activeOwners,
          Array.appendAll(inactiveOwners),
          Array.map((housingOwner) => {
            if (housingOwner.id === selectedOwner.id) {
              return {
                ...housingOwner,
                rank: (activeOwners.length + 1) as OwnerRank
              };
            }

            return housingOwner;
          })
        );
      }
    )
    .with(
      {
        from: Pattern.union('primary', 'secondary'),
        to: Pattern.union('previous', 'incorrect', 'awaiting', 'deceased')
      },
      ({ to }) => {
        const rankAfter = labelToRank(to);
        return pipe(
          activeOwners.filter((o) => o.id !== selectedOwner.id),
          Array.map((housingOwner, index) => ({
            ...housingOwner,
            // Rebuild active owner ranks
            rank: (1 + index) as OwnerRank
          })),
          Array.appendAll(
            inactiveOwners.map((housingOwner) => {
              if (housingOwner.id === selectedOwner.id) {
                return {
                  ...housingOwner,
                  rank: rankAfter
                };
              }
              return housingOwner;
            })
          ),
          Array.appendAll(
            activeOwners
              .filter((o) => o.id === selectedOwner.id)
              .map((housingOwner) => ({
                ...housingOwner,
                rank: rankAfter
              }))
          )
        );
      }
    )
    .with(
      {
        from: Pattern.union('previous', 'incorrect', 'awaiting', 'deceased'),
        to: Pattern.union('previous', 'incorrect', 'awaiting', 'deceased')
      },
      ({ to }) => {
        const rankAfter = labelToRank(to);
        return owners.map((owner) => {
          if (owner.id === selectedOwner.id) {
            return { ...owner, rank: rankAfter };
          }
          return owner;
        });
      }
    )
    .otherwise(() => owners);
}
