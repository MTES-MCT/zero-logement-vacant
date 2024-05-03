import { Knex } from 'knex';

import { OccupancyKindApi } from '~/models/HousingApi';
import {
  buildingTable,
  housingTable,
  ReferenceDataYear,
} from '~/repositories/housingRepository';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(
    `
      INSERT INTO ?? (id, housing_count, vacant_housing_count)
      SELECT
        building_id AS id,
        COUNT(building_id) AS count,
        SUM(CASE WHEN occupancy = ? AND vacancy_start_year <= ? THEN 1 ELSE 0 END) AS vacant_housing_count
      FROM ??
      WHERE building_id IS NOT NULL
      GROUP BY building_id
      ON CONFLICT (id)
      DO
        UPDATE SET vacant_housing_count = EXCLUDED.vacant_housing_count
    `,
    [
      buildingTable,
      OccupancyKindApi.Vacant,
      ReferenceDataYear - 2,
      housingTable,
    ],
  );
}
