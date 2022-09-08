import { Owner1 } from './003-owner';
import { genHousingApi } from '../../server/test/testFixtures';
import housingRepository from '../../server/repositories/housingRepository';
import { Locality1 } from './001-establishments';

export const Housing1 = genHousingApi(Locality1.geoCode);
export const Housing2 = genHousingApi(Locality1.geoCode);

// @ts-ignore
exports.seed = function(knex: any) {
    return Promise.all([
        knex.table('housing').insert([
            housingRepository.formatHousingApi(Housing1),
            housingRepository.formatHousingApi(Housing2),
        ]).then(() =>
            knex.table('owners_housing').insert([
                {
                    owner_id: Owner1.id,
                    housing_id: Housing1.id
                },
                {
                    owner_id: Owner1.id,
                    housing_id: Housing2.id
                }
            ])
        )
    ])
};
