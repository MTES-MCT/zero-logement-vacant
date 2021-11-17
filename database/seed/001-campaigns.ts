// @ts-ignore
exports.seed = function(knex) {
    return knex.table('campaigns').insert({ campaignNumber: 1, startMonth: '2111', kind: '0' })
};
