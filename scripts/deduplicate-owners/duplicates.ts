import fp from 'lodash/fp';
import { jarowinkler } from 'wuzzy';

import { OwnerApi } from '../../server/models/OwnerApi';
import ownerRepository from '../../server/repositories/ownerRepository';
import { ScoredOwner } from './comparison';
import { addDays, addYears, isEqual, subDays, subYears } from 'date-fns';

export const REVIEW_THRESHOLD = 0.7;
export const MATCH_THRESHOLD = 0.8;

export async function duplicates(owner: OwnerApi): Promise<OwnerApi[]> {
  const dups = await ownerRepository.find({
    fullName: owner.fullName,
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
      ? jarowinkler(source.rawAddress.join(''), duplicate.rawAddress.join(''))
      : null;

  const birthdayScore =
    source.birthDate && duplicate.birthDate
      ? jarowinkler(
          source.birthDate.toISOString(),
          duplicate.birthDate.toISOString()
        )
      : null;

  const computeScore = fp.pipe(fp.compact, fp.mean);
  return computeScore([addressScore, birthdayScore]) ?? 0;
}

export function findBest(scores: ScoredOwner[]): ScoredOwner | null {
  const best = fp.maxBy('score', scores);
  return best ?? null;
}

export function isMatch(scored: ScoredOwner): boolean {
  return scored.score >= MATCH_THRESHOLD;
}

export function needsManualReview(
  source: OwnerApi,
  best: ScoredOwner
): boolean {
  return (
    best.score >= REVIEW_THRESHOLD &&
    best.score <= 1 &&
    !!source.birthDate &&
    !!best.value.birthDate &&
    haveSimilarBirthdates(source.birthDate, best.value.birthDate)
  );
}

function haveSimilarBirthdates(a: Date, b: Date): boolean {
  return (
    isEqual(a, b) ||
    isEqual(a, subDays(b, 1)) ||
    isEqual(a, addDays(b, 1)) ||
    isEqual(a, subYears(b, 1)) ||
    isEqual(a, addYears(b, 1))
  );
}

export function suggest(
  source: OwnerApi,
  scores: ScoredOwner[]
): OwnerApi | null {
  const best = findBest(scores);
  if (!best || best.score < MATCH_THRESHOLD) {
    return null;
  }

  const owners = [source, best.value];

  // If both owners have a birth date, we take the most complete address
  if (owners.every((owner) => owner.birthDate)) {
    return (
      fp.maxBy((owner) => owner.rawAddress.join(' ').length, owners) ?? null
    );
  }

  // Otherwise, we take the first one with a birth date
  return owners.find((owner) => !!owner.birthDate) ?? null;
}
