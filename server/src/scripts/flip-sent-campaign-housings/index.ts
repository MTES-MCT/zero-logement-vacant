import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { today } from '~/utils/date';
import { flipSentCampaignHousings } from './task';

const logger = createLogger('flip-sent-campaign-housings');

async function run(): Promise<void> {
  if (config.app.isReviewApp) {
    logger.info('This is a review app. Skipping...');
    return;
  }

  const summary = await flipSentCampaignHousings({ today: today() });
  logger.info('Flipped sent-campaign housings to WAITING', summary);
}

run()
  .finally(() => db.destroy())
  .then(() => {
    logger.info('DB connection destroyed.');
  });
