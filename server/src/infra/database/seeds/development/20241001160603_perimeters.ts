import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Knex } from 'knex';
import { Establishments } from '~/repositories/establishmentRepository';

import {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '~/repositories/geoRepository';
import { parseUserApi, Users } from '~/repositories/userRepository';
import { genGeoPerimeterApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  console.time('20241001160603_perimeters');
  await GeoPerimeters(knex).delete();

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const users = await Users(knex).where({
      establishment_id: establishment.id
    });
    const perimeters = faker.helpers.multiple(
      () => {
        return genGeoPerimeterApi(
          establishment.id,
          parseUserApi(faker.helpers.arrayElement(users))
        );
      },
      {
        count: { min: 3, max: 10 }
      }
    );
    console.log(`Inserting ${perimeters.length} perimeters...`, {
      establishment: establishment.name
    });
    await GeoPerimeters(knex).insert(perimeters.map(formatGeoPerimeterApi));
  });
  console.timeEnd('20241001160603_perimeters');
  console.log('\n')
}
