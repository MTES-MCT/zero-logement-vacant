import { startTimer } from '../shared/elapsed';
import { logger } from '../../server/utils/logger';
import ownerImporter from './ownerImporter';
import db from '../../server/repositories/db';

startTimer((stop) => {
  ownerImporter().done(() => {
    const elapsed = stop();
    logger.info(`Done in ${elapsed}.`);
    return db.destroy();
  });
});
