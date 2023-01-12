import { genUserApi } from '../../../server/test/testFixtures';
import userRepository, {
  usersTable,
} from '../../../server/repositories/userRepository';
import { Establishment1, Establishment2 } from './001-establishments';
import { Knex } from 'knex';
import { UserRoles } from '../../../server/models/UserApi';

export const User1 = genUserApi(Establishment1.id);
export const User2 = genUserApi(Establishment2.id);
export const AdminUser1 = {
  ...genUserApi(Establishment1.id),
  role: UserRoles.Admin,
};

// @ts-ignore
exports.seed = function (knex: Knex) {
  return knex
    .table(usersTable)
    .insert([
      userRepository.formatUserApi(User1),
      userRepository.formatUserApi(User2),
      userRepository.formatUserApi(AdminUser1),
    ]);
};
