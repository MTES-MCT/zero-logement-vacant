import { genUserApi } from '../../../server/test/testFixtures';
import userRepository, {
  usersTable,
} from '../../../server/repositories/userRepository';
import { Establishment1, Establishment2 } from './001-establishments';
import { Knex } from 'knex';
import { UserRoles } from '../../../server/models/UserApi';
import bcrypt from 'bcryptjs';

export const User1 = genUserApi(Establishment1.id);
export const User2 = genUserApi(Establishment2.id);
export const AdminUser1 = {
  ...genUserApi(Establishment1.id),
  establishmentId: undefined,
  role: UserRoles.Admin,
};

// @ts-ignore
exports.seed = function (knex: Knex) {
  const users = [User1, User2, AdminUser1]
    .map((user) => ({
      ...user,
      password: bcrypt.hashSync(user.password),
    }))
    .map(userRepository.formatUserApi);
  return knex.table(usersTable).insert(users);
};
