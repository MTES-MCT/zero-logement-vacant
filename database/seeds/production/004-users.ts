import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import userRepository, {
  usersTable,
} from '../../../server/repositories/userRepository';
import { UserApi, UserRoles } from '../../../server/models/UserApi';
import config from '../../../server/utils/config';

export const Lovac2023: UserApi = {
  id: uuidv4(),
  firstName: 'Lovac',
  lastName: '2023',
  email: config.application.system,
  password: '',
  activatedAt: new Date(),
  establishmentId: undefined,
  role: UserRoles.Usual,
};

exports.seed = function (knex: Knex) {
  const users = [Lovac2023]
    .map((user) => ({
      ...user,
      password: bcrypt.hashSync(user.password),
    }))
    .map(userRepository.formatUserApi);
  return knex.table(usersTable).insert(users);
};
