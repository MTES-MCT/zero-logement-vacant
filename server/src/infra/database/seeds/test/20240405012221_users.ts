import bcrypt from 'bcryptjs';
import { Knex } from 'knex';

import { UserApi, UserRoles } from '~/models/UserApi';
import userRepository, { usersTable } from '~/repositories/userRepository';
import { genUserApi } from '~/test/testFixtures';
import {
  Establishment1,
  Establishment2
} from './20240405011849_establishments';

export const TEST_SALT = bcrypt.genSaltSync();

export const User1 = genUserApi(Establishment1.id);
export const User2 = genUserApi(Establishment2.id);
export const AdminUser1 = {
  ...genUserApi(Establishment1.id),
  establishmentId: undefined,
  role: UserRoles.Admin,
};
export const Lovac: UserApi = {
  ...genUserApi(Establishment1.id),
  establishmentId: undefined,
  role: UserRoles.Usual,
  email: 'lovac-2023@zerologementvacant.beta.gouv.fr',
};

export async function seed(knex: Knex): Promise<void> {
  const users = [User1, User2, AdminUser1, Lovac]
    .map((user) => ({
      ...user,
      password: bcrypt.hashSync(user.password, TEST_SALT),
    }))
    .map(userRepository.formatUserApi);
  return knex.table(usersTable).insert(users);
}
