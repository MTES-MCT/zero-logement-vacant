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
  needsManualReview,
  suggest,
  THRESHOLD,
} from './duplicates';
import { Comparison } from './comparison';
import db from '../../server/repositories/db';
import { formatDuration, intervalToDuration } from 'date-fns';
import { createReporter } from './reporter';
import { createRecorder } from './recorder';
import Stream = Highland.Stream;

const recorder = createRecorder();
const file = fs.createWriteStream('duplicates.json', 'utf8');

async function run(): Promise<void> {
  return new Promise((resolve, reject) => {
    const comparisons = ownerRepository
      .stream()
      .through(avoidRepetition())
      .flatMap((owner) => highland(process(owner)));

    comparisons
      .observe()
      .through(recorder.record())
      .map(createReporter('json').toString)
      .pipe(fs.createWriteStream('report.json', 'utf8'));

    comparisons
      .filter((comparison) => comparison.score >= THRESHOLD)
      .tap(logger.trace.bind(logger))
      .through(stringify('[\n', ',\n', '\n]\n'))
      .stopOnError(reject)
      .pipe(file)
      .on('finish', resolve);
  });
}

function avoidRepetition() {
  let previous = '';
  return (stream: Stream<OwnerApi>) =>
    stream
      .filter((owner) => owner.fullName !== previous)
      .tap((owner) => {
        previous = owner.fullName;
      });
}

async function process(owner: OwnerApi): Promise<Comparison> {
  // Find duplicates
  const dups = await duplicates(owner);
  const scores = dups.map((dup) => ({
    value: dup,
    score: compare(owner, dup),
  }));
  // Attach other duplicates' entities to the remaining owner
  // Remove other owners
  // If not, log a conflict for human intervention
  const best = findBest(scores);
  const suggestion = suggest(owner, scores);
  return {
    source: owner,
    duplicates: scores,
    // If possible, determine which owner to keep
    suggestion: suggestion,
    score: best?.score ?? 0,
    needsReview: best ? needsManualReview(owner, best) : false,
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

run()
  .catch(logger.error.bind(logger))
  .finally(() => {
    const end = new Date();
    const duration = intervalToDuration({ start, end });
    const elapsed = formatDuration(duration);
    logger.info(`Done in ${elapsed}.`);

    return db.destroy();
  });
