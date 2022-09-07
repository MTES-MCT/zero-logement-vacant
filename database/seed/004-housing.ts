import { Owner1 } from './003-owner';
import { genHousingApi } from '../../server/test/testFixtures';
import housingRepository from '../../server/repositories/housingRepository';

const randomstring = require('randomstring');

export const Housing1 = genHousingApi();
export const Housing2 = genHousingApi();

// @ts-ignore
exports.seed = function(knex: any) {
    return Promise.all([
        knex.table('housing').insert([
            {...housingRepository.formatHousingApi(Housing1), local_id: randomstring.generate()},
            {...housingRepository.formatHousingApi(Housing2), local_id: randomstring.generate()},
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
