import { millisecondsInSecond, subHours } from 'date-fns';

import config from '../../server/utils/config';
import db from '../../server/repositories/db';
import attio, { EstablishmentWithDomain } from './attio';
import { counter, tapAllAsync } from './stream';
import { detectDomain, UserRoles } from '../../server/models/UserApi';
import establishmentRepository from '../../server/repositories/establishmentRepository';
import userRepository from '../../server/repositories/userRepository';
import { appendAll } from '../../server/utils/stream';

// Requests per second (to comply with Attio's rate limit)
const MAX_REQUESTS_PER_FRAME = 100;
const FRAME = millisecondsInSecond;
const UPDATED_LESS_THAN_HOURS_AGO = 2; // hours

async function run() {
  if (config.application.isReviewApp) {
    console.log('This is a review app. Skipping...');
    return;
  }

  if (!config.attio.enabled) {
    console.log('This script is disabled. Skipping...');
    return;
  }

  await attio.initialize();

  console.log('Querying database...');

  function syncEstablishments(): Promise<void> {
    return new Promise((resolve) => {
      establishmentRepository
        .stream({
          // Sync the establishments updated since the last run
          updatedAfter: subHours(new Date(), UPDATED_LESS_THAN_HOURS_AGO),
        })
        .map((establishment) => ({ establishment }))
        .through(
          appendAll({
            users: ({ establishment }) =>
              userRepository.find({
                filters: {
                  establishmentIds: [establishment.id],
                },
              }),
          })
        )
        .map<EstablishmentWithDomain>((data) => ({
          ...data.establishment,
          domain: detectDomain(data.users),
        }))
        .ratelimit(MAX_REQUESTS_PER_FRAME, FRAME)
        .batch(100)
        .consume(tapAllAsync(attio.syncEstablishment))
        .sequence()
        .errors((error) => {
          console.error('Error', error);
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
        .batch(100)
        .consume(tapAllAsync(attio.syncUser))
        .sequence()
        .errors((error) => {
          console.error(error);
        })
        .through(counter((count) => `Synced ${count} users.`))
        .done(resolve);
    });
  }

  await syncEstablishments();
  await syncUsers();
}

run()
  .catch((error) => {
    console.error(error);
  })
  .finally(() => db.destroy())
  .then(() => {
    console.log('DB connection destroyed.');
  });
