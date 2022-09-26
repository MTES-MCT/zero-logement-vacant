// @ts-ignore
import { User1 } from './002-users';
import { Establishment1, Establishment2 } from './001-establishments';
import { genGeoPerimeterApi } from '../../../server/test/testFixtures';
import { Knex } from 'knex';
import geoRepository, { geoPerimetersTable } from '../../../server/repositories/geoRepository';

export const GeoPerimeter1 = genGeoPerimeterApi(Establishment1.id);
export const GeoPerimeter2 = genGeoPerimeterApi(Establishment2.id);

exports.seed = function(knex: Knex) {
    return Promise.all([
        knex.table(geoPerimetersTable).insert(geoRepository.formatGeoPerimeterApi(GeoPerimeter1)),
        knex.table(geoPerimetersTable).insert(geoRepository.formatGeoPerimeterApi(GeoPerimeter2))
    ])
};
