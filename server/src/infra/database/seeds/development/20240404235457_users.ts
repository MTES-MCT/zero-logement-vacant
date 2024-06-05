import bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { SirenSaintLo, SirenStrasbourg } from './20240404235442_establishments';
import { UserApi, UserRoles } from '~/models/UserApi';
import { establishmentsTable } from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';

export async function seed(knex: Knex): Promise<void> {
  const [strasbourg, saintLo] = await Promise.all([
    knex(establishmentsTable).where('siren', SirenStrasbourg).first(),
    knex(establishmentsTable).where('siren', SirenSaintLo).first(),
  ]);

  const users: UserApi[] = [
    {
      id: uuidv4(),
      email: 'test.strasbourg@zlv.fr',
      password: bcrypt.hashSync('test'),
      firstName: 'Test',
      lastName: 'Strasbourg',
      establishmentId: strasbourg.id,
      activatedAt: new Date(),
      role: UserRoles.Usual,
    },
    {
      id: uuidv4(),
      email: 'test.saintlo@zlv.fr',
      password: bcrypt.hashSync('test'),
      firstName: 'Test',
      lastName: 'Saint-Lô Agglo',
      establishmentId: saintLo.id,
      activatedAt: new Date(),
      role: UserRoles.Usual,
    },
    {
      id: uuidv4(),
      email: 'test.admin@zlv.fr',
      password: bcrypt.hashSync('test'),
      firstName: 'Test',
      lastName: 'Admin',
      activatedAt: new Date(),
      role: UserRoles.Admin,
    },
    {
      id: uuidv4(),
      email: 'admin@zerologementvacant.beta.gouv.fr',
      password: '',
      firstName: 'Zéro',
      lastName: 'Logement Vacant',
      role: UserRoles.Usual,
      activatedAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  await Users()
    .insert(users.map(formatUserApi))
    .onConflict('email')
    .merge(['establishment_id']);
}
