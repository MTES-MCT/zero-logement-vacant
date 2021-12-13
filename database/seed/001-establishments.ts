// @ts-ignore
exports.seed = function(knex) {
    return knex.table('establishments').insert({
        name: 'Establishment 1',
        housing_scopes: '{}'
    })
};
