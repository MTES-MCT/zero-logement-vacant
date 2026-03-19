import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';

import { PrecisionHousingEventApi } from '~/models/EventApi';
import {
  EVENTS_TABLE,
  formatEventApi,
  formatPrecisionHousingEventApi,
  PRECISION_HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  HOUSING_PRECISION_TABLE,
  HousingPrecisionDBO,
  HousingPrecisions,
  PRECISION_TABLE,
  PrecisionDBO
} from '~/repositories/precisionRepository';
import { genEventApi } from '~/test/testFixtures';

import { batchedWhereIn, getAdmin, getHousings } from './lib/events-helpers';

export async function seed(knex: Knex): Promise<void> {
  console.time('20250528170439_precision-housing-events');
  const admin = await getAdmin(knex);
  const { housingKeys } = await getHousings(knex);

  const housingPrecisions: ReadonlyArray<PrecisionDBO & HousingPrecisionDBO> =
    await batchedWhereIn<PrecisionDBO & HousingPrecisionDBO>(
      knex,
      (k) =>
        HousingPrecisions(k).join(
          PRECISION_TABLE,
          `${PRECISION_TABLE}.id`,
          `${HOUSING_PRECISION_TABLE}.precision_id`
        ),
      ['housing_geo_code', 'housing_id'],
      housingKeys
    );

  const precisionHousingEvents: ReadonlyArray<PrecisionHousingEventApi> =
    faker.helpers
      .arrayElements(housingPrecisions)
      .flatMap<PrecisionHousingEventApi>((housingPrecision) => {
        return [
          {
            ...genEventApi({
              creator: admin,
              type: 'housing:precision-attached',
              nextOld: null,
              nextNew: {
                category: housingPrecision.category,
                label: housingPrecision.label
              }
            }),
            precisionId: housingPrecision.precision_id,
            housingGeoCode: housingPrecision.housing_geo_code,
            housingId: housingPrecision.housing_id
          },
          {
            ...genEventApi({
              creator: admin,
              type: 'housing:precision-detached',
              nextOld: {
                category: housingPrecision.category,
                label: housingPrecision.label
              },
              nextNew: null
            }),
            precisionId: housingPrecision.precision_id,
            housingGeoCode: housingPrecision.housing_geo_code,
            housingId: housingPrecision.housing_id
          }
        ];
      });

  console.log(
    `Inserting ${precisionHousingEvents.length} precision housing events...`
  );
  await knex.batchInsert(
    EVENTS_TABLE,
    precisionHousingEvents.map(formatEventApi)
  );
  console.log(
    `Linking ${precisionHousingEvents.length} events to housings and precisions...`
  );
  await knex.batchInsert(
    PRECISION_HOUSING_EVENTS_TABLE,
    precisionHousingEvents.map(formatPrecisionHousingEventApi)
  );
  console.timeEnd('20250528170439_precision-housing-events');
  console.log('\n')
}
