// @ts-ignore

exports.seed = function(knex) {
    return knex.table('owners').insert({
        id: '8fd6d57c-e8d0-48c6-8989-a4992a52f33a',
        raw_address: ['4 Rue Des Talintes', '87000 Limoges'],
        full_name: 'Jean Dupont',
        invariants: [11111111],
        owner_kind: 'Particulier',
        owner_kind_detail: 'Particulier',
    })
};
