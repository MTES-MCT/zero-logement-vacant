import { isEqual } from 'date-fns';
import fp from 'lodash/fp';
import { jaccard } from 'wuzzy';

import { OwnerApi } from '../../../server/models/OwnerApi';
import ownerRepository from '../../../server/repositories/ownerRepository';
import { ScoredOwner } from '../models/Comparison';
import { isDefined, isNotNull } from '../../../shared';

export const REVIEW_THRESHOLD = 0.7;
export const MATCH_THRESHOLD = 0.85;

export async function findDuplicatesByName(
  owner: OwnerApi
): Promise<OwnerApi[]> {
  const dups = await ownerRepository.find({
    filters: {
      fullName: owner.fullName,
    },
  });

  return dups.filter((dup) => dup.id !== owner.id);
}

/**
 * Return a number between 0 and 1.
 * 0 is a miss. 1 is a full match.
 */
export function compare(source: OwnerApi, duplicate: OwnerApi): number {
  const addressScore =
    source.rawAddress.length && duplicate.rawAddress.length
      ? jaccard(
          preprocessAddress(source.rawAddress),
          preprocessAddress(duplicate.rawAddress)
        )
      : null;

  const computeScore = fp.pipe(fp.filter(isNotNull), fp.mean);
  return computeScore([addressScore]) ?? 0;
}

export const isStreetNumber = (address: string) => /^\d{4}\s/.test(address);

export const preprocessAddress = fp.pipe(
  fp.map((address: string) =>
    isStreetNumber(address) ? fp.trimCharsStart('0', address) : address
  ),
  fp.join(' '),
  fp.replace(/\s+/g, ' ')
);

export function findBest(scores: ScoredOwner[]): ScoredOwner | null {
  const best = fp.maxBy('score', scores);
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
