import { genUserApi } from '../../../server/test/testFixtures';
import userRepository, { usersTable } from '../../../server/repositories/userRepository';
import { Establishment1 } from './001-establishments';
import { Knex } from 'knex';

export const User1 = genUserApi(Establishment1.id)

// @ts-ignore
exports.seed = function(knex: Knex) {
    return knex.table(usersTable).insert(userRepository.formatUserApi(User1))
};
