import { Comparison } from '../shared/';
import { Report } from './report';
import { logger } from '~/infra/logger';
import { isMatch } from '../shared/owner-processor/duplicates';
import { DeepPartial } from 'ts-essentials';
import Stream = Highland.Stream;

class Recorder {
  report: Report = {
    overall: 0,
    match: 0,
    nonMatch: 0,
    needReview: 0,
    removed: {
      owners: 0,
      ownersHousing: 0,
    },
    score: {
      sum: 0,
      mean: 0,
    },
  };

  record() {
    return (stream: Stream<Comparison>): Stream<Report> => {
      return stream
        .reduce(this.report, (acc, comparison) => {
          const match = isMatch(comparison.score) && !comparison.needsReview;
          const nonMatch =
            !isMatch(comparison.score) && !comparison.needsReview;

          this.report = {
            overall: acc.overall + 1,
            match: acc.match + (match ? 1 : 0),
            nonMatch: acc.nonMatch + (nonMatch ? 1 : 0),
            needReview: acc.needReview + (comparison.needsReview ? 1 : 0),
            removed: this.report.removed,
            score: {
              sum: acc.score.sum + comparison.score,
              mean: 0,
            },
          };
          return this.report;
        })
        .map(computeScores);
    };
  }

  update(report: DeepPartial<Report>): void {
    this.report = {
      ...this.report,
      ...report,
      removed: {
        ...this.report.removed,
        ...report.removed,
      },
      score: {
        ...this.report.score,
        ...report.score,
      },
    };
  }

  flush(): void {
    this.report = computeScores(this.report);
    logger.debug('Scores computed', this.report.score);
  }
}

function computeScores(report: Report): Report {
  return {
    ...report,
    score: {
      ...report.score,
      mean: report.score.sum / report.overall,
    },
  };
}

export function createRecorder() {
  return new Recorder();
}
