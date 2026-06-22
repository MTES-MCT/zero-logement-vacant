import { faker } from '@faker-js/faker/locale/fr';
import createFactories, { MemoryAdapter } from '@zerologementvacant/factories';
import { Knex } from 'knex';

import { fromBuildingDTO } from '~/models/BuildingApi';
import {
  BUILDING_TABLE,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import { Establishments } from '~/repositories/establishmentRepository';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235458_buildings');
  await knex.raw(`TRUNCATE TABLE ${BUILDING_TABLE} CASCADE`);

  const factories = createFactories(new MemoryAdapter());
  const establishments = await Establishments(knex).where({ available: true });
  const buildings = establishments.flatMap(() => {
    return faker.helpers.multiple(() => factories.building.build(), {
      count: {
        min: 10,
        max: 50
      }
    });
  });

  console.log(`Inserting ${buildings.length} buildings...`);
  await knex.batchInsert(
    BUILDING_TABLE,
    buildings.map(fromBuildingDTO).map(formatBuildingApi)
  );
  console.timeEnd('20240404235458_buildings');
  console.log('\n');
}
