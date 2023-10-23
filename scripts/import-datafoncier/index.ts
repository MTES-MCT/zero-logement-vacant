import highland from 'highland';

import { startTimer } from '../shared/elapsed';
import { logger } from '../../server/utils/logger';
import ownerImporter from './ownerImporter';
import housingImporter from './housingImporter';
import housingOwnersImporter from './housingOwnersImporter';

startTimer((stop) => {
  highland([ownerImporter(), housingImporter()])
    .flatten()
    .done(() => {
      housingOwnersImporter().done(() => {
        const elapsed = stop();
        logger.info(`Done in ${elapsed}.`);
      });
    });
});
