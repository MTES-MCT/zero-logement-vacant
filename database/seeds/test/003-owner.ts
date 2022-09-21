import { genOwnerApi } from '../../../server/test/testFixtures';
import ownerRepository, { ownerTable } from '../../../server/repositories/ownerRepository';
import { Knex } from 'knex';

export const Owner1 = genOwnerApi()

// @ts-ignore
exports.seed = function(knex: Knex) {
    return knex.table(ownerTable).insert(ownerRepository.formatOwnerApi(Owner1))
};
