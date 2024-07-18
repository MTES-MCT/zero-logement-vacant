import { OwnerApi } from '~/models/OwnerApi';
import { Comparison } from '../models/Comparison';
import {
  compare,
  findBest,
  findDuplicatesByName,
  needsManualReview
} from './duplicates';
import cache from './cache';
import fp from 'lodash/fp';
import highland from 'highland';
import Stream = Highland.Stream;

export function evaluate(owner: OwnerApi, duplicates: OwnerApi[]): Comparison {
  cache.currentName(owner.fullName);
  const scores = fp.orderBy(
    'score',
    ['desc'],
    duplicates
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

export default {
  evaluate() {
    return (stream: Stream<OwnerApi>): Stream<Comparison> => {
      return stream.flatMap((owner) =>
        highland(findDuplicatesByName(owner))
          .map((duplicates) => [owner, ...duplicates])
          .map((owners) => {
            return owners.flatMap((owner) => {
              return evaluate(
                owner,
                owners.filter((o) => o.id !== owner.id)
              );
            });
          })
          .flatten()
      );
    };
  },
};
