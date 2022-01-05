// @ts-ignore

exports.seed = function(knex) {
    return Promise.all([
        knex.table('housing').insert([
            {
                id: 'c0ec7153-0e1c-4770-bc98-ad6ce1779f9a',
                invariant: 'I1',
                local_id: 'L1',
                building_id: 'B1',
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
            },
            {
                id: '3180bb27-1ca8-4e32-bc71-79f04e424aa8',
                invariant: 'I2',
                local_id: 'L2',
                building_id: 'B2',
                raw_address: ['14 Rue De Mounangelle', '87270 city2'],
                insee_code: 87085,
                latitude: 1,
                longitude: 1,
                living_area: 100,
                housing_kind: 'APPART',
                rooms_count: 5,
                building_year: 1980,
                vacancy_start_year: 2015,
                cadastral_classification: 3,
                cadastral_reference: 'A78215',
                uncomfortable: false,
                mutation_date: '01/01/2000',
                taxed: false
            }
        ]).then(() =>
            knex.table('owners_housing').insert([
                {
                    owner_id: '8fd6d57c-e8d0-48c6-8989-a4992a52f33a',
                    housing_id: 'c0ec7153-0e1c-4770-bc98-ad6ce1779f9a'
                },
                {
                    owner_id: '8fd6d57c-e8d0-48c6-8989-a4992a52f33a',
                    housing_id: '3180bb27-1ca8-4e32-bc71-79f04e424aa8'
                }
            ])
        )
    ])
};
