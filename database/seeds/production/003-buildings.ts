import { Knex } from 'knex';
import {
  buildingTable,
  housingTable,
  ReferenceDataYear,
} from '../../../server/repositories/housingRepository';
import { OccupancyKindApi } from '../../../server/models/HousingApi';

exports.seed = function (knex: Knex) {
  return knex
    .table(housingTable)
    .select('building_id')
    .count('building_id')
    .sum({
      vacant_housing_count: knex.raw(
        `
        (CASE WHEN occupancy = ? and vacancy_start_year <= ? THEN 1 ELSE 0 END)
      `,
        [OccupancyKindApi.Vacant, ReferenceDataYear - 2]
      ),
    })
    .whereNotNull('building_id')
    .groupBy('building_id')
    .then((results: any[]) => {
      if (results.length) {
        knex
          .table(buildingTable)
          .insert(
            results.map((result) => ({
              id: result.building_id,
              housing_count: result.count,
              vacant_housing_count: result.vacant_housing_count,
            }))
          )
          .onConflict('id')
          .merge(['vacant_housing_count']);
      }
    });
};
