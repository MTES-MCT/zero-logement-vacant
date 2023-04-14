import { millisecondsInMinute, subHours } from 'date-fns';

import config from '../../server/utils/config';
import establishmentRepository from '../../server/repositories/establishmentRepository';
import db from '../../server/repositories/db';
import attio from './attio';
import { counter, tapAsync } from './stream';
import userRepository from '../../server/repositories/userRepository';
import { UserRoles } from '../../server/models/UserApi';

// 5000 requests by minute (Attio's rate limit)
const MAX_REQUESTS_PER_FRAME = 1000;
const FRAME = millisecondsInMinute;
const UPDATED_LESS_THAN_HOURS_AGO = 2; // hours

async function run() {
  if (config.application.isReviewApp) {
    console.log('This is a review app. Skipping...');
    return;
  }

  console.log('Querying database...');

  function syncEstablishments(): Promise<void> {
    return new Promise((resolve) => {
      establishmentRepository
        .stream({
          // Sync the establishments updated since the last run
          updatedAfter: subHours(new Date(), UPDATED_LESS_THAN_HOURS_AGO),
        })
        .ratelimit(MAX_REQUESTS_PER_FRAME, FRAME)
        .consume(tapAsync(attio.syncEstablishment))
        .errors((error) => {
          console.error(error);
        })
        .tap((establishment) => {
          console.log(`Synced ${establishment.name}`);
        })
        .through(counter((count) => `Synced ${count} establishments.`))
        .done(resolve);
    });
  }

  function syncUsers(): Promise<void> {
    return new Promise((resolve) => {
      userRepository
        .stream({
          roles: [UserRoles.Usual],
          updatedAfter: subHours(new Date(), UPDATED_LESS_THAN_HOURS_AGO),
        })
        .ratelimit(MAX_REQUESTS_PER_FRAME, FRAME)
        .consume(tapAsync(attio.syncUser))
        .errors((error) => {
          console.error(error);
        })
        .tap((user) => {
          console.log(`Synced ${user.email}`);
        })
        .through(counter((count) => `Synced ${count} users.`))
        .done(resolve);
    });
  }

  return Promise.all([syncEstablishments(), syncUsers()]);
}

run()
  .catch((error) => {
    console.error(error);
  })
  .finally(() => db.destroy())
  .then(() => {
    console.log('DB connection destroyed.');
  });
