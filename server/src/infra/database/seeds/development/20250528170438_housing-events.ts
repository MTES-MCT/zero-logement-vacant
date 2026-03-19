import { faker } from '@faker-js/faker/locale/fr';
import {
  HOUSING_STATUS_LABELS,
  OCCUPANCY_LABELS,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { Knex } from 'knex';

import { HousingEventApi } from '~/models/EventApi';
import {
  EVENTS_TABLE,
  formatEventApi,
  formatHousingEventApi,
  HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import { genEventApi } from '~/test/testFixtures';

import { getAdmin, getHousings } from './lib/events-helpers';

export async function seed(knex: Knex): Promise<void> {
  console.time('20250528170438_housing-events');
  await knex.raw(`TRUNCATE TABLE ${EVENTS_TABLE} CASCADE`);

  const admin = await getAdmin(knex);
  const { housings } = await getHousings(knex);

  const housingEvents: ReadonlyArray<HousingEventApi> = faker.helpers
    .arrayElements(housings)
    .map((housing) => {
      const events: ReadonlyArray<HousingEventApi> = [
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:created',
            nextOld: null,
            nextNew: {
              source: housing.data_file_years?.length
                ? housing.data_file_years[0]
                : 'datafoncier-manual',
              occupancy: 'Vacant'
            }
          }),
          housingGeoCode: housing.geo_code,
          housingId: housing.id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:occupancy-updated',
            nextOld: {
              occupancy:
                OCCUPANCY_LABELS[
                  faker.helpers.arrayElement(
                    OCCUPANCY_VALUES.filter(
                      (occupancy) => occupancy !== housing.occupancy
                    )
                  )
                ]
            },
            nextNew: {
              occupancy: OCCUPANCY_LABELS[housing.occupancy]
            }
          }),
          housingGeoCode: housing.geo_code,
          housingId: housing.id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:status-updated',
            nextOld: {
              status: faker.helpers.arrayElement(
                Object.values(HOUSING_STATUS_LABELS)
              )
            },
            nextNew: {
              status: HOUSING_STATUS_LABELS[housing.status]
            }
          }),
          housingGeoCode: housing.geo_code,
          housingId: housing.id
        }
      ];
      return faker.helpers.arrayElements(events, {
        min: 1,
        max: events.length
      });
    })
    .flat();

  console.log(`Creating ${housingEvents.length} housing events...`);
  await knex.batchInsert(EVENTS_TABLE, housingEvents.map(formatEventApi));
  console.log(`Linking ${housingEvents.length} events to housings...`);
  await knex.batchInsert(
    HOUSING_EVENTS_TABLE,
    housingEvents.map(formatHousingEventApi)
  );
  console.timeEnd('20250528170438_housing-events');
  console.log('\n')
}
