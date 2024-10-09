import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Knex } from 'knex';

import {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '~/repositories/geoRepository';
import { genGeoPerimeterApi } from '~/test/testFixtures';
import { Establishments } from '~/repositories/establishmentRepository';
import { Users } from '~/repositories/userRepository';

export async function seed(knex: Knex): Promise<void> {
  await GeoPerimeters(knex).delete();

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEach(establishments, async (establishment) => {
    const users = await Users(knex).where({
      establishment_id: establishment.id
    });
    const perimeters = faker.helpers.multiple(
      () => {
        return genGeoPerimeterApi(
          establishment.id,
          faker.helpers.arrayElement(users)
        );
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
