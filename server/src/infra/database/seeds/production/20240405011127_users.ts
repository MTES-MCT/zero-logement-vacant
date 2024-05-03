import bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { UserApi, UserRoles } from '~/models/UserApi';
import { formatUserApi, usersTable } from '~/repositories/userRepository';

export const Lovac2023: UserApi = {
  id: uuidv4(),
  firstName: 'Lovac',
  lastName: '2023',
  email: 'lovac-2023@zerologementvacant.beta.gouv.fr',
  password: '',
  activatedAt: new Date(),
  establishmentId: undefined,
  role: UserRoles.Usual,
};

export async function seed(knex: Knex): Promise<void> {
  const users = [Lovac2023]
    .map((user) => ({
      ...user,
      password: bcrypt.hashSync(user.password),
    }))
    .map(formatUserApi);
  await knex.table(usersTable).insert(users);
}
