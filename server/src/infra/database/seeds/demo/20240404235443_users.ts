import { faker } from '@faker-js/faker/locale/fr';
import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { Knex } from 'knex';

import config from '~/infra/config';
import { SALT_LENGTH } from '~/models/UserApi';
import { Establishments } from '~/repositories/establishmentRepository';
import { toUserDBO, USERS_TABLE } from '~/repositories/userRepository';
import { factories } from '~/test/factories';

import {
  SirenSaintLo,
  SirenStrasbourg,
  ZeroLogementVacantEstablishment
} from './20240404235442_establishments';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235457_users');

  await knex.raw(`TRUNCATE TABLE ${USERS_TABLE} CASCADE`);

  if (!config.e2e.email || !config.e2e.password) {
    throw new Error('You must provide E2E_EMAIL and E2E_PASSWORD');
  }

  const password = config.auth.testPassword;

  const [strasbourg, saintLo, zlv] = await Promise.all([
    Establishments(knex).where('siren', SirenStrasbourg).first(),
    Establishments(knex).where('siren', SirenSaintLo).first(),
    Establishments(knex).where('name', ZeroLogementVacantEstablishment).first()
  ]);
  if (!strasbourg || !saintLo || !zlv) {
    throw new Error('Establishments not found');
  }

  const now = new Date().toJSON();
  const baseUsers = [
    factories.user.build({
      email: 'test.strasbourg@zlv.fr',
      firstName: 'Test',
      lastName: 'Strasbourg',
      establishmentId: strasbourg.id,
      activatedAt: now,
      role: UserRole.USUAL
    }),
    factories.user.build({
      email: 'test.saintlo@zlv.fr',
      firstName: 'Test',
      lastName: 'Saint-Lô Agglo',
      establishmentId: saintLo.id,
      activatedAt: now,
      role: UserRole.USUAL
    }),
    factories.user.build({
      email: 'test.admin@zlv.fr',
      firstName: 'Test',
      lastName: 'Admin',
      activatedAt: now,
      role: UserRole.ADMIN,
      establishmentId: null
    }),
    factories.user.build({
      email: 'test.visitor@zlv.fr',
      firstName: 'Test',
      lastName: 'Visitor',
      activatedAt: now,
      role: UserRole.VISITOR,
      establishmentId: null
    })
  ];

  const establishments = await Establishments(knex).where({ available: true });
  const randomUsers = establishments.flatMap((establishments) => {
    return factories.user.buildList(faker.number.int({ min: 1, max: 10 }), {
      establishmentId: establishments.id
    });
  });

  const hashedPassword = await bcrypt.hash(password, SALT_LENGTH);
  const users = baseUsers
    .concat(randomUsers)
    .map(toUserDBO)
    .map((user) => ({
      ...user,
      password: hashedPassword
    }));
  console.log(`Inserting ${users.length} users...\n`);
  await knex.batchInsert(USERS_TABLE, users);

  console.timeEnd('20240404235457_users');
}
