import {
  prependOriginalHousing,
  housingStream,
  parseLocalId,
} from './housing-stream';
import merger from './merger';
import { logger } from '../../server/utils/logger';
import { formatElapsed, timer } from '../shared/elapsed';
import db from '../../server/repositories/db';

export function run() {
  const stop = timer();

  housingStream()
    .tap((housing) => {
      logger.debug(`Processing ${housing.localId}...`);
    })
    .group((housing) => parseLocalId(housing.localId))
    .through(prependOriginalHousing)
    .through(merger.merge())
    .done(() => {
      const elapsed = stop();
      logger.info(`Done in ${formatElapsed(elapsed)}.`);

      db.destroy();
    });
}
