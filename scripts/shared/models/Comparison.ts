import { OwnerApi } from '../../../server/models/OwnerApi';

export interface Comparison {
  source: OwnerApi;
  duplicates: Scored<OwnerApi>[];
  /**
   * A number between 0 and 1
   */
  score: number;
  needsReview: boolean;
}

export interface Scored<T> {
  score: number;
  value: T;
}

export type ScoredOwner = Scored<OwnerApi>;
