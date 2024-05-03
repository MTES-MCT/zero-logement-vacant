import { Knex } from 'knex';

import {
  eventsTable,
  formatEventApi,
  housingEventsTable,
  ownerEventsTable,
} from '~/repositories/eventRepository';
import { genHousingEventApi, genOwnerEventApi } from '~/test/testFixtures';
import { Housing1 } from './20240405012750_housing';
import { Owner1 } from './20240405012710_owner';
import { User1 } from './20240405012221_users';

export const OwnerEvent1 = genOwnerEventApi(Owner1.id, User1.id);
export const HousingEvent1 = genHousingEventApi(Housing1, User1);

export async function seed(knex: Knex): Promise<void> {
  await Promise.all([
    knex
      .table(eventsTable)
      .insert([formatEventApi(OwnerEvent1)])
      .then(() =>
        knex
          .table(ownerEventsTable)
          .insert({ event_id: OwnerEvent1.id, owner_id: Owner1.id }),
      ),
    knex
      .table(eventsTable)
      .insert([formatEventApi(HousingEvent1)])
      .then(() =>
        knex.table(housingEventsTable).insert({
          event_id: HousingEvent1.id,
          housing_id: Housing1.id,
          housing_geo_code: Housing1.geoCode,
        }),
      ),
  ]);
}
