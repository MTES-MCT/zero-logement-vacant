import { Establishment1, Establishment2 } from './001-establishments';
import { genGeoPerimeterApi } from '../../../server/test/testFixtures';
import { Knex } from 'knex';
import {
  formatGeoPerimeterApi,
  geoPerimetersTable,
} from '../../../server/repositories/geoRepository';

export const GeoPerimeter1 = genGeoPerimeterApi(Establishment1.id);
export const GeoPerimeter2 = genGeoPerimeterApi(Establishment2.id);

exports.seed = function (knex: Knex) {
  return Promise.all([
    knex.table(geoPerimetersTable).insert(formatGeoPerimeterApi(GeoPerimeter1)),
    knex.table(geoPerimetersTable).insert(formatGeoPerimeterApi(GeoPerimeter2)),
  ]);
};
