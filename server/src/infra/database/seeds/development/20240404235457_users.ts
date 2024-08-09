import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { SirenSaintLo, SirenStrasbourg } from './20240404235442_establishments';
import { UserApi, UserRoles } from '~/models/UserApi';
import { Establishments } from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { genUserApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  await Users(knex).delete();

  const [strasbourg, saintLo] = await Promise.all([
    Establishments(knex).where('siren', SirenStrasbourg).first(),
    Establishments(knex).where('siren', SirenSaintLo).first()
  ]);

  if (!strasbourg || !saintLo) {
    throw new Error('Establishments not found');
  }

  const baseUsers: UserApi[] = [
    {
      id: uuidv4(),
      email: 'test.strasbourg@zlv.fr',
      password: bcrypt.hashSync('test'),
      firstName: 'Test',
      lastName: 'Strasbourg',
      establishmentId: strasbourg.id,
      activatedAt: new Date(),
      role: UserRoles.Usual
    },
    {
      id: uuidv4(),
      email: 'test.saintlo@zlv.fr',
      password: bcrypt.hashSync('test'),
      firstName: 'Test',
      lastName: 'Saint-Lô Agglo',
      establishmentId: saintLo.id,
      activatedAt: new Date(),
      role: UserRoles.Usual
    },
    {
      id: uuidv4(),
      email: 'test.admin@zlv.fr',
      password: bcrypt.hashSync('test'),
      firstName: 'Test',
      lastName: 'Admin',
      activatedAt: new Date(),
      role: UserRoles.Admin
    },
    {
      id: uuidv4(),
      email: 'test.visitor@zlv.fr',
      password: bcrypt.hashSync('test'),
      firstName: 'Test',
      lastName: 'Visitor',
      activatedAt: new Date(),
      role: UserRoles.Visitor
    },
    {
      id: uuidv4(),
      email: 'admin@zerologementvacant.beta.gouv.fr',
      password: '',
      firstName: 'Zéro',
      lastName: 'Logement Vacant',
      role: UserRoles.Usual,
      activatedAt: new Date(),
      updatedAt: new Date()
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
