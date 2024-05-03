import { formatElapsed, timer } from '../shared/';
import { logger } from '~/infra/logger';
import ownerImporter from './ownerImporter';
import db from '~/infra/database/';
import { existingHousingOwnersImporter } from './existingHousingOwnersImporter';
import { SingleBar, Presets } from 'cli-progress';

const stop = timer();

const progressBarOwner = new SingleBar({}, Presets.shades_classic);
ownerImporter(progressBarOwner).done(async () => {
  progressBarOwner.stop();
  logger.info('Done importing owners.');

  const progressBarHousingOwners = new SingleBar({}, Presets.shades_classic);
  (await existingHousingOwnersImporter(progressBarHousingOwners)).done(() => {
    const elapsed = stop();
    progressBarHousingOwners.stop();
    logger.info(`Done in ${formatElapsed(elapsed)}.`);
    return db.destroy();
  });
});
