import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Knex } from 'knex';

import {
  EstablishmentDBO,
  establishmentsTable
} from '~/repositories/establishmentRepository';
import {
  formatGeoPerimeterApi,
  GeoPerimeterDBO,
  geoPerimetersTable
} from '~/repositories/geoRepository';
import {
  fromUserDBO,
  USERS_TABLE,
  UserDBO
} from '~/repositories/userRepository';
import { genGeoPerimeterApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  console.time('20241001160603_perimeters');
  await knex<GeoPerimeterDBO>(geoPerimetersTable).delete();

  const establishments = await knex<EstablishmentDBO>(
    establishmentsTable
  ).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const users = await knex<UserDBO>(USERS_TABLE).where({
      establishment_id: establishment.id
    });
    const perimeters = faker.helpers.multiple(
      () => {
        return genGeoPerimeterApi(
          establishment.id,
          fromUserDBO(faker.helpers.arrayElement(users))
        );
      },
      {
        count: { min: 3, max: 10 }
      }
    );
    console.log(`Inserting ${perimeters.length} perimeters...`, {
      establishment: establishment.name
    });
    await knex<GeoPerimeterDBO>(geoPerimetersTable).insert(
      perimeters.map(formatGeoPerimeterApi)
    );
  });
  console.timeEnd('20241001160603_perimeters');
  console.log('\n');
}
