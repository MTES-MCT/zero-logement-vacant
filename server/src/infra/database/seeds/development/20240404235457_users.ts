import { faker } from '@faker-js/faker/locale/fr';
import { UserRole } from '@zerologementvacant/models';
import async from 'async';
import bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import config from '~/infra/config';
import { SALT_LENGTH, UserApi } from '~/models/UserApi';
import { Establishments } from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { genUserApi } from '~/test/testFixtures';

import {
  SirenSaintLo,
  SirenStrasbourg,
  ZeroLogementVacantEstablishment
} from './20240404235442_establishments';

export async function seed(knex: Knex): Promise<void> {
  await Users(knex).delete();

  const [strasbourg, saintLo, zlv] = await Promise.all([
    Establishments(knex).where('siren', SirenStrasbourg).first(),
    Establishments(knex).where('siren', SirenSaintLo).first(),
    Establishments(knex).where('name', ZeroLogementVacantEstablishment).first()
  ]);

  if (!strasbourg || !saintLo || !zlv) {
    throw new Error('Establishments not found');
  }

  if (!config.e2e.email || !config.e2e.password) {
    throw new Error('You must provide E2E_EMAIL and E2E_PASSWORD');
  }

  const password: string = process.env.TEST_PASSWORD || '';

  if (password === '') {
    throw new Error('You must provide TEST_PASSWORD');
  }

  const baseUsers: UserApi[] = [
    {
      id: uuidv4(),
      email: 'test.strasbourg@zlv.fr',
      password: bcrypt.hashSync(password),
      firstName: 'Test',
      lastName: 'Strasbourg',
      establishmentId: strasbourg.id,
      activatedAt: new Date().toJSON(),
      role: UserRole.USUAL,
      position: null,
      timePerWeek: null,
      phone: null,
      lastAuthenticatedAt: null,
      updatedAt: new Date().toJSON(),
      deletedAt: null,
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorCode: null,
      twoFactorCodeGeneratedAt: null
    },
    {
      id: uuidv4(),
      email: 'test.saintlo@zlv.fr',
      password: bcrypt.hashSync(password),
      firstName: 'Test',
      lastName: 'Saint-Lô Agglo',
      establishmentId: saintLo.id,
      activatedAt: new Date().toJSON(),
      role: UserRole.USUAL,
      position: null,
      timePerWeek: null,
      phone: null,
      lastAuthenticatedAt: null,
      updatedAt: new Date().toJSON(),
      deletedAt: null,
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorCode: null,
      twoFactorCodeGeneratedAt: null
    },
    {
      id: uuidv4(),
      email: 'test.admin@zlv.fr',
      password: bcrypt.hashSync(password),
      firstName: 'Test',
      lastName: 'Admin',
      activatedAt: new Date().toJSON(),
      role: UserRole.ADMIN,
      position: null,
      timePerWeek: null,
      phone: null,
      lastAuthenticatedAt: null,
      updatedAt: new Date().toJSON(),
      deletedAt: null,
      establishmentId: null,
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorCode: null,
      twoFactorCodeGeneratedAt: null
    },
    {
      id: uuidv4(),
      email: 'test.visitor@zlv.fr',
      password: bcrypt.hashSync(password),
      firstName: 'Test',
      lastName: 'Visitor',
      activatedAt: new Date().toJSON(),
      role: UserRole.VISITOR,
      position: null,
      timePerWeek: null,
      phone: null,
      lastAuthenticatedAt: null,
      updatedAt: new Date().toJSON(),
      deletedAt: null,
      establishmentId: null,
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorCode: null,
      twoFactorCodeGeneratedAt: null
    },
    {
      id: uuidv4(),
      email: 'admin@zerologementvacant.beta.gouv.fr',
      password: '',
      firstName: 'Zéro',
      lastName: 'Logement Vacant',
      role: UserRole.USUAL,
      activatedAt: new Date().toJSON(),
      updatedAt: new Date().toJSON(),
      position: null,
      timePerWeek: null,
      phone: null,
      lastAuthenticatedAt: null,
      deletedAt: null,
      establishmentId: null,
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorCode: null,
      twoFactorCodeGeneratedAt: null
    },
    // End-to-end test user
    {
      id: uuidv4(),
      email: config.e2e.email,
      password: await bcrypt.hash(config.e2e.password, SALT_LENGTH),
      firstName: 'End',
      lastName: 'TO END',
      establishmentId: zlv.id,
      role: UserRole.USUAL,
      activatedAt: new Date().toJSON(),
      updatedAt: new Date().toJSON(),
      position: null,
      timePerWeek: null,
      phone: null,
      lastAuthenticatedAt: null,
      deletedAt: null,
      twoFactorSecret: null,
      twoFactorEnabledAt: null,
      twoFactorCode: null,
      twoFactorCodeGeneratedAt: null
    }
  ];
  await Users()
    .insert(baseUsers.map(formatUserApi))
    .onConflict('email')
    .merge(['establishment_id']);

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const users = faker.helpers
      .multiple(() => genUserApi(establishment.id), {
        count: { min: 1, max: 10 }
      })
      .map(formatUserApi);
    await Users(knex).insert(users);
  });
}
