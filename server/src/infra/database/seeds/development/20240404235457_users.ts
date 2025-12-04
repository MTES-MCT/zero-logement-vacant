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

// Types
interface EstablishmentsData {
  strasbourg: NonNullable<Awaited<ReturnType<ReturnType<typeof Establishments>['first']>>>;
  saintLo: NonNullable<Awaited<ReturnType<ReturnType<typeof Establishments>['first']>>>;
  zlv: NonNullable<Awaited<ReturnType<ReturnType<typeof Establishments>['first']>>>;
}

export async function seed(knex: Knex): Promise<void> {
  await clearExistingData(knex);
  validateEnvironmentVariables();

  const password = getTestPassword();
  const establishments = await fetchEstablishments(knex);
  const baseUsers = await createBaseUsers(password, establishments);

  await insertBaseUsers(baseUsers);
  await generateRandomUsers(knex);
}

async function clearExistingData(knex: Knex): Promise<void> {
  await Users(knex).delete();
}

function validateEnvironmentVariables(): void {
  if (!config.e2e.email || !config.e2e.password) {
    throw new Error('You must provide E2E_EMAIL and E2E_PASSWORD');
  }
}

function getTestPassword(): string {
  const password = process.env.TEST_PASSWORD || '';
  if (password === '') {
    throw new Error('You must provide TEST_PASSWORD');
  }
  return password;
}

async function fetchEstablishments(knex: Knex): Promise<EstablishmentsData> {
  const [strasbourg, saintLo, zlv] = await Promise.all([
    Establishments(knex).where('siren', SirenStrasbourg).first(),
    Establishments(knex).where('siren', SirenSaintLo).first(),
    Establishments(knex).where('name', ZeroLogementVacantEstablishment).first()
  ]);

  if (!strasbourg || !saintLo || !zlv) {
    throw new Error('Establishments not found');
  }

  return { strasbourg, saintLo, zlv };
}

function createBaseUser(overrides: Partial<UserApi> & Pick<UserApi, 'email' | 'password' | 'firstName' | 'lastName' | 'role' | 'activatedAt' | 'establishmentId'>): UserApi {
  return {
    id: uuidv4(),
    updatedAt: new Date().toJSON(),
    position: null,
    timePerWeek: null,
    phone: null,
    lastAuthenticatedAt: null,
    suspendedAt: null,
    suspendedCause: null,
    deletedAt: null,
    twoFactorSecret: null,
    twoFactorEnabledAt: null,
    twoFactorCode: null,
    twoFactorCodeGeneratedAt: null,
    twoFactorFailedAttempts: 0,
    twoFactorLockedUntil: null,
    kind: null,
    ...overrides
  };
}

async function createBaseUsers(
  password: string,
  { strasbourg, saintLo, zlv }: EstablishmentsData
): Promise<UserApi[]> {
  const hashedPassword = bcrypt.hashSync(password);
  const now = new Date().toJSON();
  const e2ePasswordHash = await bcrypt.hash(config.e2e.password!, SALT_LENGTH);

  return [
    createBaseUser({
      email: 'test.strasbourg@zlv.fr',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Strasbourg',
      establishmentId: strasbourg.id,
      activatedAt: now,
      role: UserRole.USUAL
    }),
    createBaseUser({
      email: 'test.saintlo@zlv.fr',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Saint-Lô Agglo',
      establishmentId: saintLo.id,
      activatedAt: now,
      role: UserRole.USUAL
    }),
    createBaseUser({
      email: 'test.admin@zlv.fr',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Admin',
      activatedAt: now,
      role: UserRole.ADMIN,
      establishmentId: null
    }),
    createBaseUser({
      email: 'test.visitor@zlv.fr',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Visitor',
      activatedAt: now,
      role: UserRole.VISITOR,
      establishmentId: null
    }),
    createBaseUser({
      email: 'admin@zerologementvacant.beta.gouv.fr',
      password: '',
      firstName: 'Zéro',
      lastName: 'Logement Vacant',
      role: UserRole.USUAL,
      activatedAt: now,
      establishmentId: null
    }),
    // End-to-end test user
    createBaseUser({
      email: config.e2e.email!,
      password: e2ePasswordHash,
      firstName: 'End',
      lastName: 'TO END',
      establishmentId: zlv.id,
      role: UserRole.USUAL,
      activatedAt: now
    }),
    // Suspended users - for testing suspension modal
    createBaseUser({
      email: 'test.suspended.user@zlv.fr',
      password: hashedPassword,
      firstName: 'Suspendu',
      lastName: 'Droits Utilisateur',
      establishmentId: strasbourg.id,
      activatedAt: now,
      role: UserRole.USUAL,
      suspendedAt: now,
      suspendedCause: 'droits utilisateur expires'
    }),
    createBaseUser({
      email: 'test.suspended.structure@zlv.fr',
      password: hashedPassword,
      firstName: 'Suspendu',
      lastName: 'Droits Structure',
      establishmentId: saintLo.id,
      activatedAt: now,
      role: UserRole.USUAL,
      suspendedAt: now,
      suspendedCause: 'droits structure expires'
    }),
    createBaseUser({
      email: 'test.suspended.cgu@zlv.fr',
      password: hashedPassword,
      firstName: 'Suspendu',
      lastName: 'CGU Vides',
      establishmentId: strasbourg.id,
      activatedAt: now,
      role: UserRole.USUAL,
      suspendedAt: now,
      suspendedCause: 'cgu vides'
    }),
    createBaseUser({
      email: 'test.suspended.multiple@zlv.fr',
      password: hashedPassword,
      firstName: 'Suspendu',
      lastName: 'Raisons Multiples',
      establishmentId: saintLo.id,
      activatedAt: now,
      role: UserRole.USUAL,
      suspendedAt: now,
      suspendedCause: 'droits utilisateur expires, droits structure expires, cgu vides'
    })
  ];
}

async function insertBaseUsers(baseUsers: UserApi[]): Promise<void> {
  await Users()
    .insert(baseUsers.map(formatUserApi))
    .onConflict('email')
    .merge(['establishment_id']);
}

async function generateRandomUsers(knex: Knex): Promise<void> {
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
