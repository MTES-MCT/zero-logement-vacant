import { genUserApi } from '../../server/test/testFixtures';
import userRepository from '../../server/repositories/userRepository';
import { Establishment1 } from './001-establishments';

export const User1 = genUserApi(Establishment1.id)

// @ts-ignore
exports.seed = function(knex) {
    return knex.table('users').insert(userRepository.formatUserApi(User1))
};
