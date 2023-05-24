import { Knex } from 'knex';
import {
  genHousingEventApi,
  genOwnerEventApi,
} from '../../../server/test/testFixtures';
import { Owner1 } from './004-owner';
import eventRepository, {
  eventsTable,
  housingEventsTable,
  ownerEventsTable,
} from '../../../server/repositories/eventRepository';
import { Housing1 } from './005-housing';
import { User1 } from './003-users';

export const OwnerEvent1 = genOwnerEventApi(Owner1.id, User1.id);
export const HousingEvent1 = genHousingEventApi(Housing1.id, User1.id);

exports.seed = function (knex: Knex) {
  return Promise.all([
    knex
      .table(eventsTable)
      .insert([eventRepository.formatEventApi(OwnerEvent1)])
      .then(() =>
        knex
          .table(ownerEventsTable)
          .insert({ event_id: OwnerEvent1.id, owner_id: Owner1.id })
      ),
    knex
      .table(eventsTable)
      .insert([eventRepository.formatEventApi(HousingEvent1)])
      .then(() =>
        knex
          .table(housingEventsTable)
          .insert({ event_id: HousingEvent1.id, housing_id: Housing1.id })
      ),
  ]);
};
