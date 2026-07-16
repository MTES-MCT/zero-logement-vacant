import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import userRepository from '~/repositories/userRepository';
import { today } from '~/utils/date';
import { flipSentCampaignHousings } from './task';

const logger = createLogger('flip-sent-campaign-housings');
const ADMIN_EMAIL = 'admin@zerologementvacant.beta.gouv.fr';

async function run(): Promise<void> {
  if (config.app.isReviewApp) {
    logger.info('This is a review app. Skipping...');
    return;
  }

  const admin = await userRepository.getByEmail(ADMIN_EMAIL);
  if (!admin) {
    throw new UserMissingError(ADMIN_EMAIL);
  }

  const summary = await flipSentCampaignHousings({
    createdBy: admin.id,
    today: today()
  });
  logger.info('Flipped sent-campaign housings to WAITING', summary);
}

run()
  .finally(() => db.destroy())
  .then(() => {
    logger.info('DB connection destroyed.');
  });
