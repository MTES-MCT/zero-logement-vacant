import { pathToFileURL } from 'node:url';

import config from '~/infra/config';
import db from '~/infra/database';
import { kysely } from '~/infra/database/kysely';
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

  if (summary.failed > 0) {
    throw new Error(
      `${summary.failed} of ${summary.campaigns} campaign(s) failed to flip`
    );
  }
}

export async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    logger.error('Flip sent-campaign housings failed', { error });
    process.exitCode = 1;
  } finally {
    await Promise.all([db.destroy(), kysely.destroy()]);
    logger.info('DB connections destroyed.');
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  await main();
}
