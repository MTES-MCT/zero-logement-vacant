import { Knex } from 'knex';

exports.up = function(knex: Knex) {
    return Promise.all([
        knex.table('housing')
            .update({
                status: 0,
                sub_status: null,
                precisions: null,
                vacancy_reasons: null
            })
            .whereNotExists(function (whereBuilder: any) {
                whereBuilder.from('campaigns_housing')
                    .whereRaw('housing_id = housing.id')
            }),
        knex.schema// @ts-ignore
            .alterTable('housing', table => {
                table.integer('status').defaultTo(0).alter();
            }),
    ]);
};


exports.down = function() {
    return Promise.all([
    ]);
};
