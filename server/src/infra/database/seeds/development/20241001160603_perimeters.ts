import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Knex } from 'knex';

import {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '~/repositories/geoRepository';
import { genGeoPerimeterApi } from '~/test/testFixtures';
import { Establishments } from '~/repositories/establishmentRepository';

export async function seed(knex: Knex): Promise<void> {
  await GeoPerimeters(knex).delete();

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEach(establishments, async (establishment) => {
    const perimeters = faker.helpers.multiple(
      () => {
        return genGeoPerimeterApi(establishment.id);
      },
      {
        count: { min: 3, max: 10 }
      }
    );
    console.log('Inserting perimeters...', {
      establishment: establishment.name,
      perimeters: perimeters.length
    });
    await GeoPerimeters(knex).insert(perimeters.map(formatGeoPerimeterApi));
  });
}
