import async from 'async';
import { Knex } from 'knex';

import {
  BUILDING_TABLE,
  BuildingDBO,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import { genBuildingApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`TRUNCATE TABLE ${BUILDING_TABLE} CASCADE`);

  const establishments = await Establishments(knex);
  await async.forEachSeries(establishments, async () => {
    const buildings: ReadonlyArray<BuildingDBO> = Array.from(
      { length: 10 },
      genBuildingApi
    ).map(formatBuildingApi);

    console.log(`Inserting ${buildings.length} buildings...`);
    await knex.batchInsert(BUILDING_TABLE, buildings);
  });
}
