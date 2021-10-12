// @ts-ignore
exports.seed = function(knex) {
    return knex.table('campaigns').insert({ name: 'Campagne 1' })
};
