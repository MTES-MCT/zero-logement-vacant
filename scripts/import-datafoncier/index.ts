import { startTimer } from '../shared/elapsed';
import { logger } from '../../server/utils/logger';
import ownerImporter from './ownerImporter';
import db from '../../server/repositories/db';
import { existingHousingOwnersImporter } from './existingHousingOwnersImporter';

startTimer((stop) => {
  ownerImporter().done(() => {
    logger.info('Done importing owners.');
    existingHousingOwnersImporter().done(() => {
      const elapsed = stop();
      logger.info(`Done in ${elapsed}.`);
      return db.destroy();
    });
  });
});
