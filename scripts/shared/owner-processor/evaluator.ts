import { OwnerApi } from '../../../server/models/OwnerApi';
import { Comparison } from '../models';
import {
  compare,
  findBest,
  findDuplicatesByName,
  needsManualReview,
} from './duplicates';
import cache from './cache';
import fp from 'lodash/fp';

export async function evaluate(owner: OwnerApi): Promise<Comparison> {
  // Find duplicates
  const dups = await findDuplicatesByName(owner);

  cache.currentName(owner.fullName);
  const scores = fp.sortBy(
    'score',
    dups
      .filter((dup) => !cache.has(owner.id, dup.id))
      .map((dup) => ({
        value: dup,
        score: compare(owner, dup),
      }))
      .map((comparison) => {
        cache.add(owner.id, comparison.value.id);
        return comparison;
      })
  );

  const best = findBest(scores);
  return {
    source: owner,
    duplicates: scores,
    score: best?.score ?? 0,
    // Log a conflict for human intervention
    needsReview: best ? needsManualReview(owner, scores) : false,
  };
}
