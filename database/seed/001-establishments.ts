// @ts-ignore
exports.seed = function(knex) {

    return Promise.all([
        knex.table('localities').insert({
            id: 'c4d3878f-aa7a-42b2-bcdc-869431b0919d',
            geo_code: ['00000'],
            name: 'Locality 1'
        }),
        knex.table('establishments').insert({
            id: 'fb42415a-a41a-4b22-bf47-7bedfb419a63',
            localities_id: ['c4d3878f-aa7a-42b2-bcdc-869431b0919d'],
            name: 'Establishment 1',
            housing_scopes: '{}'
        })
    ])
};
