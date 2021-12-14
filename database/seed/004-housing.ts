// @ts-ignore

exports.seed = function(knex) {
    return knex.table('housing').insert({
        id: 'c0ec7153-0e1c-4770-bc98-ad6ce1779f9a',
        invariant: 11111111,
        raw_address: ['14 Rue De Mounangelle', '87000 city'],
        insee_code: 87085,
        latitude: 1,
        longitude: 1,
        living_area: 100,
        housing_kind: 'MAISON',
        rooms_count: 5,
        building_year: 1980,
        vacancy_start_year: 2015,
        cadastral_classification: 3,
        cadastral_reference: 'A452132',
        uncomfortable: false,
        mutation_date: '01/01/2000',
        taxed: false
    })
};
