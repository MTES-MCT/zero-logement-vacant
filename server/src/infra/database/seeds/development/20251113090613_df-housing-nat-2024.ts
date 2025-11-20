import { faker } from '@faker-js/faker';
import { genDatafoncierHousing } from '@zerologementvacant/models/fixtures';
import type { Geometry } from 'geojson';
import type { Knex } from 'knex';

import { Buildings } from '~/repositories/buildingRepository';
import { Establishments } from '~/repositories/establishmentRepository';

const TABLE = 'df_housing_nat_2024';

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLE).truncate();

  const [buildings, establishments] = await Promise.all([
    Buildings(knex),
    Establishments().where({ available: true })
  ]);

  const datafoncierHousings = establishments.flatMap((establishment) => {
    return faker.helpers.multiple(
      () => {
        const idprocpte = faker.helpers.arrayElement(
          establishment.localities_geo_code
        );
        const building = faker.helpers.arrayElement(buildings);

        return genDatafoncierHousing(idprocpte, building.id);
      },
      {
        count: { min: 50, max: 200 }
      }
    );
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
