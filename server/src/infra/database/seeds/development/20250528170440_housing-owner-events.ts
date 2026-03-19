import { faker } from '@faker-js/faker/locale/fr';
import { OWNER_RANKS } from '@zerologementvacant/models';
import { Knex } from 'knex';

import { HousingOwnerEventApi } from '~/models/EventApi';
import {
  EVENTS_TABLE,
  formatEventApi,
  formatHousingOwnerEventApi,
  HOUSING_OWNER_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { genEventApi } from '~/test/testFixtures';

import { batchedWhereIn, getAdmin, getHousings } from './lib/events-helpers';

export async function seed(knex: Knex): Promise<void> {
  console.time('20250528170440_housing-owner-events');
  const admin = await getAdmin(knex);
  const { housingKeys } = await getHousings(knex);

  const housingOwners: ReadonlyArray<HousingOwnerDBO> =
    await batchedWhereIn<HousingOwnerDBO>(
      knex,
      (k) => HousingOwners(k),
      ['housing_geo_code', 'housing_id'],
      housingKeys
    );

  const housingOwnerEvents: ReadonlyArray<HousingOwnerEventApi> = faker.helpers
    .arrayElements(housingOwners)
    .flatMap((housingOwner): HousingOwnerEventApi[] => {
      return [
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:owner-attached',
            nextOld: null,
            nextNew: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            }
          }),
          ownerId: housingOwner.owner_id,
          housingGeoCode: housingOwner.housing_geo_code,
          housingId: housingOwner.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:owner-updated',
            nextOld: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            },
            nextNew: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            }
          }),
          ownerId: housingOwner.owner_id,
          housingGeoCode: housingOwner.housing_geo_code,
          housingId: housingOwner.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:owner-detached',
            nextOld: {
              name: faker.person.fullName(),
              rank: faker.helpers.arrayElement(OWNER_RANKS)
            },
            nextNew: null
          }),
          ownerId: housingOwner.owner_id,
          housingGeoCode: housingOwner.housing_geo_code,
          housingId: housingOwner.housing_id
        }
      ];
    });

  console.log(`Inserting ${housingOwnerEvents.length} housing owner events...`);
  await knex.batchInsert(EVENTS_TABLE, housingOwnerEvents.map(formatEventApi));
  console.log(
    `Linking ${housingOwnerEvents.length} events to housing owners...`
  );
  await knex.batchInsert(
    HOUSING_OWNER_EVENTS_TABLE,
    housingOwnerEvents.map(formatHousingOwnerEventApi)
  );
  console.timeEnd('20250528170440_housing-owner-events');
  console.log('\n')
}
