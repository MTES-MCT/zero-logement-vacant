import highland from 'highland';

import { startTimer } from '../shared/elapsed';
import { logger } from '../../server/utils/logger';
import ownerImporter from './ownerImporter';
import housingOwnersImporter from './housingOwnersImporter';
import db from '../../server/repositories/db';

startTimer((stop) => {
  // TODO: importer uniquement les proprios liés aux logements existants dans ZLV
  highland([ownerImporter()])
    .flatten()
    .done(() => {
      housingOwnersImporter().done(() => {
        const elapsed = stop();
        logger.info(`Done in ${elapsed}.`);
        return db.destroy();
      });
    });
});
