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
import merger from './merger';
import ownersDuplicatesRepository from './ownersDuplicatesRepository';
import { OwnerDuplicate } from './OwnerDuplicate';
import { formatElapsed, timer } from '../shared/elapsed';
import evaluator from '../shared/owner-processor/evaluator';

const recorder = createRecorder();
const reporter = createReporter('json');

function run(): void {
  const comparisons = ownerRepository
    .stream()
    .tap((owner) => logger.trace(`Processing ${owner.fullName}...`))
    .through(evaluator.evaluate());

  comparisons
    .fork()
    .through(recorder.record())
    .map(reporter.toString)
    .each((report) => {
      logger.info(report);
    });

  const duplicateWriter = comparisons
    .fork()
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
    .tap((duplicate) =>
      logger.trace('Found duplicate', {
        id: duplicate.id,
        fullName: duplicate.fullName,
      })
    )
    .batch(1000)
    .flatMap((duplicates) =>
      highland(ownersDuplicatesRepository.save(...duplicates))
    );

  const ownerMerger = comparisons
    .fork()
    .filter((comparison) => isMatch(comparison.score))
    .filter((comparison) => !comparison.needsReview)
    .on('owners:removed', (count: number) => {
      recorder.update({
        removed: {
          owners: recorder.report.removed.owners + count,
        },
      });
    })
    .on('owners-housing:removed', (count: number) => {
      recorder.update({
        removed: {
          ownersHousing: recorder.report.removed.ownersHousing + count,
        },
      });
    })
    .through(merger.merge());

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
