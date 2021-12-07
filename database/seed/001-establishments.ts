// @ts-ignore
exports.seed = function(knex) {
    return knex.table('establishments').insert({
        id: 1,
        name: 'Establishment 1',
        housing_scopes: '{}'
    })
};
