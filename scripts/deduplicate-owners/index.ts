import highland from 'highland';
import script from 'node:process';

import { logger } from '../../server/utils/logger';
import ownerRepository from '../../server/repositories/ownerRepository';
import { OwnerApi } from '../../server/models/OwnerApi';
import {
  compare,
  findBest,
  findDuplicatesByName,
  isMatch,
  needsManualReview,
} from './duplicates';
import { Comparison } from './comparison';
import db from '../../server/repositories/db';
import { formatDuration, intervalToDuration } from 'date-fns';
import { createReporter } from './reporter';
import { createRecorder } from './recorder';
import ownerCache from './ownerCache';
import createMerger from './merger';
import ownersDuplicatesRepository from './ownersDuplicatesRepository';
import { OwnerDuplicate } from './OwnerDuplicate';

const recorder = createRecorder();
const reporter = createReporter('json');
const merger = createMerger();

merger.on('owners:removed', (count) => {
  recorder.update({
    removed: {
      owners: recorder.report.removed.owners + count,
    },
  });
});

merger.on('owners-housing:removed', (count) => {
  recorder.update({
    removed: {
      ownersHousing: recorder.report.removed.ownersHousing + count,
    },
  });
});

function run(): void {
  const comparisons = ownerRepository
    .stream()
    .tap(logger.trace.bind(logger))
    .flatMap((owner) => highland(process(owner)));

  comparisons
    .fork()
    .through(recorder.record())
    .map(reporter.toString)
    .pipe(script.stdout)
    .on('finish', () => {
      logger.info('Report written.');
    });

  const duplicateWriter = comparisons
    .fork()
    .filter((comparison) => comparison.needsReview)
    .map((comparison) =>
      comparison.duplicates
        .filter((duplicate) =>
          needsManualReview(comparison.source, [duplicate])
        )
        .map<OwnerDuplicate>((duplicate) => ({
          ...duplicate.value,
          sourceId: comparison.source.id,
        }))
    )
    .flatten()
    .tap(logger.trace.bind(logger))
    .batch(1000)
    .flatMap((duplicates) =>
      highland(ownersDuplicatesRepository.save(...duplicates))
    );

  const ownerMerger = comparisons
    .fork()
    .filter((comparison) => isMatch(comparison.score))
    .filter((comparison) => !comparison.needsReview)
    .flatMap((comparison) => highland(merger.merge(comparison)));

  highland([duplicateWriter, ownerMerger])
    .merge()
    .errors((error) => {
      logger.error(error);
    })
    .done(() => {
      logger.info('Duplicates written.');
      logger.info('Owners merged.');

      ownersDuplicatesRepository.removeOrphans().then(() => {
        script.exit();
      });
    });
}

async function process(owner: OwnerApi): Promise<Comparison> {
  // Find duplicates
  const dups = await findDuplicatesByName(owner);

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
  const report = reporter.toString(recorder.report);
  logger.info(report);
  logger.info('Report written.');
  script.exit();
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
