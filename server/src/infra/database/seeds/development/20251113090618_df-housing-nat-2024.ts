import { faker } from '@faker-js/faker';
import type { DatafoncierOwner } from '@zerologementvacant/models';
import { genDatafoncierHousing } from '@zerologementvacant/models/fixtures';
import type { Geometry } from 'geojson';
import type { Knex } from 'knex';

import { groupBy } from '~/infra/database/index';
import { Buildings } from '~/repositories/buildingRepository';
import { DatafoncierOwners } from '~/repositories/datafoncierOwnersRepository';

const TABLE = 'df_housing_nat_2024';

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLE).truncate();

  const buildings = await Buildings(knex);

  const datafoncierOwners: DatafoncierOwner[] = await DatafoncierOwners(knex)
    .select()
    .modify(groupBy<DatafoncierOwner>(['idprocpte']));
  const datafoncierHousings = datafoncierOwners.map((datafoncierOwner) => {
    const building = faker.helpers.arrayElement(buildings)
    return {
      ...genDatafoncierHousing(datafoncierOwner.idprocpte, building.id),
      idbat: faker.helpers.arrayElement(buildings).id
    };
  });

  console.log(
    `Inserting ${datafoncierHousings.length} datafoncier housings...`
  );
  await knex.batchInsert(
    TABLE,
    datafoncierHousings.map((datafoncierHousing) => ({
      ...datafoncierHousing,
      geomloc: fromGeoJSON(knex, datafoncierHousing.geomloc),
      ban_geom: fromGeoJSON(knex, datafoncierHousing.ban_geom),
      geomrnb: fromGeoJSON(knex, datafoncierHousing.geomrnb)
    })),
    500
  );
}

function fromGeoJSON(db: Knex, geometry: Geometry | null): Knex.Raw | null {
  return geometry
    ? db.raw(`ST_GeomFromGeoJson('${JSON.stringify(geometry)}')`)
    : null;
}
