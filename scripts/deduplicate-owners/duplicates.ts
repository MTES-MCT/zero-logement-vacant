import fp from 'lodash/fp';
import { jarowinkler } from 'wuzzy';

import { OwnerApi } from '../../server/models/OwnerApi';
import ownerRepository from '../../server/repositories/ownerRepository';
import { ScoredOwner } from './comparison';
import { isEqual } from 'date-fns';

export const THRESHOLD = 0.8;

export async function duplicates(owner: OwnerApi): Promise<OwnerApi[]> {
  // TODO: duplicates using the same address and birth date
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
  if (source.rawAddress?.length > 0 && duplicate.rawAddress?.length > 0) {
    const score = jarowinkler(
      source.rawAddress.join(''),
      duplicate.rawAddress.join('')
    );
    return source.birthDate &&
      duplicate.birthDate &&
      isEqual(source.birthDate, duplicate.birthDate)
      ? fp.mean([score, 1])
      : score;
  }
  return 0;
}

export function findBest(scores: ScoredOwner[]): ScoredOwner | null {
  const best = fp.maxBy('score', scores);
  return best ?? null;
}

export function needsManualReview(
  source: OwnerApi,
  best: ScoredOwner
): boolean {
  return (
    best.score >= THRESHOLD &&
    best.score <= 1 &&
    !!source.birthDate &&
    !!best.value.birthDate &&
    isEqual(source.birthDate, best.value.birthDate)
  );
}

export function suggest(
  source: OwnerApi,
  scores: ScoredOwner[]
): OwnerApi | null {
  const best = findBest(scores);
  if (!best || best.score < THRESHOLD) {
    return null;
  }

  const owners = [source, best.value];
  return (
    owners.find((owner) => !!owner.birthDate) ??
    fp.maxBy((owner) => owner.rawAddress.length, owners) ??
    null
  );
}
