import { Knex } from 'knex';

import {
  Establishment1,
  Establishment2,
} from './20240405011849_establishments';
import {
  formatGeoPerimeterApi,
  geoPerimetersTable,
} from '~/repositories/geoRepository';
import { genGeoPerimeterApi } from '~/test/testFixtures';

export const GeoPerimeter1 = genGeoPerimeterApi(Establishment1.id);
export const GeoPerimeter2 = genGeoPerimeterApi(Establishment2.id);

export async function seed(knex: Knex): Promise<void> {
  await knex
    .table(geoPerimetersTable)
    .insert([GeoPerimeter1, GeoPerimeter2].map(formatGeoPerimeterApi));
}
