import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';

import { OwnerEventApi } from '~/models/EventApi';
import {
  EVENTS_TABLE,
  formatEventApi,
  formatOwnerEventApi,
  OWNER_EVENTS_TABLE
} from '~/repositories/eventRepository';
import { OwnerDBO, Owners } from '~/repositories/ownerRepository';
import { genEventApi } from '~/test/testFixtures';

import { getAdmin, LIMIT } from './lib/events-helpers';

export async function seed(knex: Knex): Promise<void> {
  console.time('20250528170443_owner-events');
  const admin = await getAdmin(knex);

  const owners: ReadonlyArray<OwnerDBO> = await Owners().limit(LIMIT);

  const ownerEvents: ReadonlyArray<OwnerEventApi> = faker.helpers
    .arrayElements(owners)
    .flatMap((owner): OwnerEventApi[] => {
      return [
        {
          ...genEventApi({
            creator: admin,
            type: 'owner:updated',
            nextOld: {
              name: faker.person.fullName(),
              birthdate: faker.date.birthdate().toJSON()
            },
            nextNew: {
              name: owner.full_name,
              birthdate: owner.birth_date
                ? new Date(owner.birth_date).toJSON()
                : null
            }
          }),
          ownerId: owner.id
        }
      ];
    });

  console.log(`Inserting ${ownerEvents.length} owner events...`);
  await knex.batchInsert(EVENTS_TABLE, ownerEvents.map(formatEventApi));
  console.log(`Linking ${ownerEvents.length} events to owners...`);
  await knex.batchInsert(
    OWNER_EVENTS_TABLE,
    ownerEvents.map(formatOwnerEventApi)
  );
  console.timeEnd('20250528170443_owner-events');
  console.log('\n')
}
