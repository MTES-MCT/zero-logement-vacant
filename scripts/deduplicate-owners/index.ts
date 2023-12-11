import highland from 'highland';
import script from 'node:process';

import { logger } from '../../server/utils/logger';
import ownerRepository from '../../server/repositories/ownerRepository';
import {
  isMatch,
  needsManualReview,
} from '../shared/owner-processor/duplicates';
import db from '../../server/repositories/db';
import { createReporter } from './reporter';
import { createRecorder } from './recorder';
import createMerger from './merger';
import ownersDuplicatesRepository from './ownersDuplicatesRepository';
import { OwnerDuplicate } from './OwnerDuplicate';
import { evaluate } from '../shared';
import { formatElapsed, timer } from '../shared/elapsed';

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
    .tap((owner) => logger.trace(`Processing ${owner.fullName}...`))
    .flatMap((owner) => highland(evaluate(owner)));

  comparisons
    .fork()
    .through(recorder.record())
    .map(reporter.toString)
    .each((report) => {
      logger.info(report);
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
    .tap((duplicate) => logger.trace('Found duplicate', duplicate.fullName))
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

script.once('SIGINT', cleanUp);
script.once('SIGTERM', cleanUp);

function cleanUp() {
  recorder.flush();
  const report = reporter.toString(recorder.report);
  logger.info(report);
  logger.info('Report written.');
  script.exit();
}

const stop = timer();

script.on('exit', () => {
  const elapsed = formatElapsed(stop());
  logger.info(`Done in ${elapsed}.`);

  return db.destroy();
});

run();
