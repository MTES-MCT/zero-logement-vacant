import highland from 'highland';
import { stringify } from 'jsonstream';
import fs from 'node:fs';

import script from 'node:process';

import { logger } from '../../server/utils/logger';
import ownerRepository from '../../server/repositories/ownerRepository';
import { OwnerApi } from '../../server/models/OwnerApi';
import {
  compare,
  duplicates,
  findBest,
  isMatch,
  needsManualReview,
} from './duplicates';
import { Comparison } from './comparison';
import db from '../../server/repositories/db';
import { formatDuration, intervalToDuration } from 'date-fns';
import { createReporter } from './reporter';
import { createRecorder } from './recorder';
import ownerCache from './owner-cache';
import merger from './merger';

const recorder = createRecorder();
const file = fs.createWriteStream('duplicates.json', 'utf8');

function run(): void {
  const comparisons = ownerRepository
    .stream()
    .flatMap((owner) => highland(process(owner)));

  comparisons
    .observe()
    .through(recorder.record())
    .map(createReporter('json').toString)
    .pipe(fs.createWriteStream('report.json', 'utf8'))
    .on('finish', () => {
      logger.info('Report written to report.json');
      script.exit();
    });

  comparisons
    .observe()
    .filter((comparison) => isMatch(comparison.score))
    .tap(logger.trace.bind(logger))
    .through(stringify('[\n', ',\n', '\n]\n'))
    .stopOnError(logger.error.bind(logger))
    .pipe(file);

  comparisons
    .filter((comparison) => isMatch(comparison.score))
    .filter((comparison) => !comparison.needsReview)
    .flatMap((comparison) => highland(merger.merge(comparison)))
    .errors((error) => {
      logger.error(error);
    })
    .done(() => {
      logger.info('Everything all right!');
    });
}

async function process(owner: OwnerApi): Promise<Comparison> {
  // Find duplicates
  const dups = await duplicates(owner);

  ownerCache.currentName(owner.fullName);
  const scores = dups
    .filter((dup) => !ownerCache.has(owner.id, dup.id))
    .map((dup) => ({
      value: dup,
      score: compare(owner, dup),
    }))
    .map((comparison) => {
      ownerCache.add(owner.id, comparison.value.id);
      return comparison;
    });

  const best = findBest(scores);
  return {
    source: owner,
    duplicates: scores,
    score: best?.score ?? 0,
    // Log a conflict for human intervention
    needsReview: best ? needsManualReview(owner, scores) : false,
  };
}

script.once('SIGINT', cleanUp);
script.once('SIGTERM', cleanUp);

function cleanUp() {
  recorder.flush();
  const report = createReporter('json').toString(recorder.report);
  fs.writeFileSync('report.json', report, 'utf8');
  logger.info('Report written to report.json');
  file.write('\n]', () => {
    file.close(() => {
      script.exit();
    });
  });
}

const start = new Date();

script.on('exit', () => {
  const end = new Date();
  const duration = intervalToDuration({ start, end });
  const elapsed = formatDuration(duration);
  logger.info(`Done in ${elapsed}.`);

  return db.destroy();
});

run();
