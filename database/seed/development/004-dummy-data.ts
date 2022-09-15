// @ts-ignore
import { establishmentsTable, housingScopeGeometryTable } from '../../../server/repositories/establishmentRepository';
import { Knex } from 'knex';
import path from 'path';

exports.seed = function(knex: Knex) {
    return knex.schema.raw(`call load_data('${path.join(__dirname, '../../data/development/dummy_data.csv')}')`)
};
