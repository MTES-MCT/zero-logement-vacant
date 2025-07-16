import { isDefined, isNotNull } from '@zerologementvacant/utils';
import { isEqual } from 'date-fns';
import { Array, flow, pipe, Predicate, String } from 'effect';
import { maxBy, mean, trimStart } from 'lodash-es';
import { jaccard } from 'wuzzy';

import { OwnerApi } from '~/models/OwnerApi';
import ownerRepository from '~/repositories/ownerRepository';
import { ScoredOwner } from '../models/Comparison';

export const REVIEW_THRESHOLD = 0.7;
export const MATCH_THRESHOLD = 0.85;

export async function findDuplicatesByName(
  owner: OwnerApi
): Promise<OwnerApi[]> {
  const dups = await ownerRepository.find({
    filters: {
      fullName: owner.fullName
    }
  });

  return dups.filter((dup) => dup.id !== owner.id);
}

/**
 * Return a number between 0 and 1.
 * 0 is a miss. 1 is a full match.
 */
export function compare(source: OwnerApi, duplicate: OwnerApi): number {
  const addressScore =
    source.rawAddress?.length && duplicate.rawAddress?.length
      ? jaccard(
          preprocessAddress(source.rawAddress),
          preprocessAddress(duplicate.rawAddress)
        )
      : null;

  return pipe([addressScore], Array.filter(Predicate.isNotNull), mean) ?? 0;
}

export const isStreetNumber = (address: string) => /^\d{4}\s/.test(address);

export const preprocessAddress: (address: string[]) => string = flow(
  Array.map((address: string) =>
    isStreetNumber(address) ? trimStart('0', address) : address
  ),
  Array.join(' '),
  String.replace(/\s+/g, ' ')
);

export function findBest(scores: ScoredOwner[]): ScoredOwner | null {
  const best = maxBy(scores, 'scores');
  return best ?? null;
}

export function isReviewMatch(score: number): boolean {
  return REVIEW_THRESHOLD <= score && score < MATCH_THRESHOLD;
}

export function isMatch(score: number): boolean {
  return score >= MATCH_THRESHOLD;
}

export function isPerfectMatch(score: number): boolean {
  return score === 1;
}

export function needsManualReview(
  source: OwnerApi,
  duplicates: ScoredOwner[]
): boolean {
  const matches = duplicates.filter(
    (_) => isReviewMatch(_.score) || isMatch(_.score)
  );

  return (
    duplicates.every((match) => isReviewMatch(match.score)) ||
    dateConflict(
      source,
      matches.map((_) => _.value)
    )
  );
}

function dateConflict(source: OwnerApi, matches: OwnerApi[]): boolean {
  const dates = [source, ...matches]
    .map((owner) => owner.birthDate)
    .filter(isDefined)
    .filter(isNotNull);
  return dates.length >= 2 && dates.some((date) => !isEqual(date, dates[0]));
}
