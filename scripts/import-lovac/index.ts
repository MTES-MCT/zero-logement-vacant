import progress from 'cli-progress';

import { tapAsync } from '../sync-attio/stream';
import { bulkSave, compare, Comparison } from './action';
import housingRepository from '../../server/repositories/housingRepository';
import db from '../../server/repositories/db';
import modificationRepository from './modification-repository';
import { appendAll, count } from './stream';
import lovacRepository from './lovac-repository';

const BATCH_SIZE = 1000;

function run() {
  const overallProgress = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );
  const saveProgress = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );

  return housingRepository
    .stream()
    .through(count())
    .flatMap((total) => {
      overallProgress.start(total, 0);
      saveProgress.start(total, 0);

      return housingRepository
        .stream()
        .tap(() => {
          overallProgress.increment();
        })
        .map((housing) => ({ before: housing }))
        .through(
          appendAll({
            now: () => lovacRepository.findOne(),
            modifications: ({ before }) =>
              modificationRepository.find({
                housingId: before.id,
              }),
          })
        )
        .map((_) => _ as Comparison)
        .concat(
          lovacRepository.streamNewHousing().map<Comparison>((housing) => ({
            before: null,
            now: housing,
            modifications: [],
          }))
        )
        .map(compare)
        .batch(BATCH_SIZE)
        .consume(tapAsync(bulkSave))
        .tap((actions) => {
          saveProgress.update(actions.length);
        })
        .on('end', () => {
          overallProgress.stop();
          saveProgress.stop();
        });
    });
}

run().done(() => {
  db.destroy();
});
