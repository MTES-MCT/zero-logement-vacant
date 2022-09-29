// @ts-ignore
import { establishmentsTable, housingScopeGeometryTable } from '../../../server/repositories/establishmentRepository';
import { Knex } from 'knex';
import { buildingTable, housingTable } from '../../../server/repositories/housingRepository';

const randomIntFromInterval = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1) + Number(min))

exports.seed = function(knex: Knex) {
    return knex
        .table(housingTable)
        .select('building_id')
        .count('building_id')
        .groupBy('building_id')
        .then((results: any[]) =>
            knex.table(buildingTable)
                .insert(results.map(result => ({
                    id: result.building_id,
                    housing_count: randomIntFromInterval(result.count, 10),
                    vacant_housing_count: result.count,
                })))
                .onConflict('id')
                .merge(['vacant_housing_count'])
        )

};
