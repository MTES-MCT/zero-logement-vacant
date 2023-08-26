import { Comparison } from './comparison';
import { Report } from './report';
import { logger } from '../../server/utils/logger';
import Stream = Highland.Stream;

class Recorder {
  report: Report = {
    overall: 0,
    match: 0,
    nonMatch: 0,
    needReview: 0,
    score: {
      sum: 0,
      mean: 0,
    },
  };

  record() {
    return (stream: Stream<Comparison>): Stream<Report> => {
      return stream
        .reduce(this.report, (acc, comparison) => {
          const isMatch = comparison.suggestion !== null;

          this.report = {
            overall: acc.overall + 1,
            match: acc.match + (isMatch ? 1 : 0),
            nonMatch: acc.nonMatch + (!isMatch ? 1 : 0),
            needReview: acc.needReview + (comparison.needsReview ? 1 : 0),
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

  flush() {
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
