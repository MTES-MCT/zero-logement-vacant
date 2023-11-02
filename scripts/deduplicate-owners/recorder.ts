import { Comparison } from '../shared/models/Comparison';
import { Report } from './report';
import { logger } from '../../server/utils/logger';
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
          const matches = comparison.duplicates.filter((_) => isMatch(_.score));
          const nonMatches = comparison.duplicates.filter(
            (_) => !isMatch(_.score)
          );

          this.report = {
            overall: acc.overall + 1,
            match: acc.match + matches.length,
            nonMatch: acc.nonMatch + nonMatches.length,
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
