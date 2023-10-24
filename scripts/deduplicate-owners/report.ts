export interface Report {
  overall: number;
  match: number;
  nonMatch: number;
  needReview: number;
  removed: {
    owners: number;
    ownersHousing: number;
  };
  score: {
    sum: number;
    mean: number;
  };
}
