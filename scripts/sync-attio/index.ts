import { subHours, millisecondsInMinute } from 'date-fns';

import config from '../../server/utils/config';
import establishmentRepository from '../../server/repositories/establishmentRepository';
import db from '../../server/repositories/db';
import attio from './attio';
import { tapAsync } from './stream';

// 5000 requests by minute (Attio's rate limit)
const MAX_REQUESTS_PER_FRAME = 5000;
const FRAME = millisecondsInMinute;
const UPDATED_LESS_THAN_HOURS_AGO = 2; // hours

async function run() {
  if (config.application.isReviewApp) {
    console.log('This is a review app. Skipping...');
    return;
  }

  let count = 0;

  console.log('Querying database...');
  const query = establishmentRepository.stream({
    // Sync the establishments updated since the last run
    updatedAfter: subHours(new Date(), UPDATED_LESS_THAN_HOURS_AGO),
  });

  return new Promise<void>((resolve) => {
    query
      .ratelimit(MAX_REQUESTS_PER_FRAME, FRAME)
      .consume(tapAsync(attio.sync))
      .errors((error) => {
        console.error(error);
      })
      .tap((establishment) => {
        count++;
        console.log('Synced', establishment.name);
      })
      .done(() => {
        // Needed because .done() does not destroy the input stream.
        query.destroy();
        console.log(`Synced ${count} establishments.`);
        resolve();
      });
  });
}

run()
  .finally(() => db.destroy())
  .then(() => {
    console.log('DB connection destroyed.');
  });
