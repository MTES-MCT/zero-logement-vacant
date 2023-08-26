export interface Report {
  overall: number;
  match: number;
  nonMatch: number;
  needReview: number;
  score: {
    sum: number;
    mean: number;
  };
}
