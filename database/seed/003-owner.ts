import { genOwnerApi } from '../../server/test/testFixtures';
import ownerRepository from '../../server/repositories/ownerRepository';

export const Owner1 = genOwnerApi()

// @ts-ignore
exports.seed = function(knex) {
    return knex.table('owners').insert(ownerRepository.formatOwnerApi(Owner1))
};
