// @ts-ignore
import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { Knex } from 'knex';
import { SirenSaintLo, SirenStrasbourg } from './001-establishments';
import userRepository, {
  usersTable,
} from '../../../server/repositories/userRepository';
import { UserApi, UserRoles } from '../../../server/models/UserApi';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { genUserApi } from '../../../server/test/testFixtures';
import { Establishment1 } from '../test/001-establishments';
import config from '../../../server/utils/config';

exports.seed = function (knex: Knex) {
  const lovac: UserApi = {
    ...genUserApi(Establishment1.id),
    establishmentId: undefined,
    role: UserRoles.Usual,
    email: config.application.system,
  };
  return Promise.all([
    knex
      .table(establishmentsTable)
      .where('siren', SirenStrasbourg)
      .first()
      .then((result) =>
        knex
          .table(usersTable)
          .insert(
            userRepository.formatUserApi(<UserApi>{
              id: uuidv4(),
              email: 'test.strasbourg@zlv.fr',
              password: bcrypt.hashSync('test'),
              firstName: 'Test',
              lastName: 'Strasbourg',
              establishmentId: result.id,
              activatedAt: new Date(),
              role: UserRoles.Usual,
            })
          )
          .onConflict('email')
          .ignore()
      ),
    knex
      .table(establishmentsTable)
      .where('siren', SirenSaintLo)
      .first()
      .then((result) =>
        knex
          .table(usersTable)
          .insert(
            userRepository.formatUserApi(<UserApi>{
              id: uuidv4(),
              email: 'test.saintlo@zlv.fr',
              password: bcrypt.hashSync('test'),
              firstName: 'Test',
              lastName: 'Saint-Lô Agglo',
              establishmentId: result.id,
              activatedAt: new Date(),
              role: UserRoles.Usual,
            })
          )
          .onConflict('email')
          .ignore()
      ),
    knex
      .table(usersTable)
      .insert(
        userRepository.formatUserApi(<UserApi>{
          id: uuidv4(),
          email: 'test.admin@zlv.fr',
          password: bcrypt.hashSync('test'),
          firstName: 'Test',
          lastName: 'Admin',
          activatedAt: new Date(),
          role: UserRoles.Admin,
        })
      )
      .onConflict('email')
      .ignore(),
    knex
      .table(usersTable)
      .insert(userRepository.formatUserApi(lovac))
      .onConflict('email')
      .ignore(),
  ]);
};
