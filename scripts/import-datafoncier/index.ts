import { formatElapsed, timer } from '../shared/';
import { logger } from '../../server/utils/logger';
import ownerImporter from './ownerImporter';
import db from '../../server/repositories/db';
import { existingHousingOwnersImporter } from './existingHousingOwnersImporter';

const stop = timer();

ownerImporter().done(() => {
  logger.info('Done importing owners.');
  existingHousingOwnersImporter().done(() => {
    const elapsed = stop();
    logger.info(`Done in ${formatElapsed(elapsed)}.`);
    return db.destroy();
  });
});
