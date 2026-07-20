import { randomUUID } from 'node:crypto';

import { faker } from '@faker-js/faker/locale/fr';
import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import config from '~/infra/config';
import { SALT_LENGTH, UserApi } from '~/models/UserApi';
import { Establishments } from '~/repositories/establishmentRepository';
import { toUserDBO, Users, USERS_TABLE } from '~/repositories/userRepository';
import { genUserApi } from '~/test/testFixtures';

import {
  SirenSaintLo,
  SirenStrasbourg,
  ZeroLogementVacantEstablishment
} from './20240404235442_establishments';

// Types
interface EstablishmentsData {
  strasbourg: NonNullable<
    Awaited<ReturnType<ReturnType<typeof Establishments>['first']>>
  >;
  saintLo: NonNullable<
    Awaited<ReturnType<ReturnType<typeof Establishments>['first']>>
  >;
  zlv: NonNullable<
    Awaited<ReturnType<ReturnType<typeof Establishments>['first']>>
  >;
}

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235457_users');
  await clearExistingData(knex);
  validateEnvironmentVariables();

  const password = config.auth.testPassword;
  const establishments = await fetchEstablishments(knex);
  const baseUsers = await createBaseUsers(password, establishments);

  await insertBaseUsers(knex, baseUsers);
  await generateRandomUsers(knex);
  await syncUserEstablishments(knex, establishments);
  console.timeEnd('20240404235457_users');
}

async function clearExistingData(knex: Knex): Promise<void> {
  // Delete in FK-aware order: account → session → auth_users → users.
  // (account / session reference auth_users.id; auth_users mirrors users.id.)
  await knex('account').delete();
  await knex('session').delete();
  await knex('auth_users').delete();
  await Users(knex).delete();
}

function validateEnvironmentVariables(): void {
  if (!config.e2e.email || !config.e2e.password) {
    throw new Error('You must provide E2E_EMAIL and E2E_PASSWORD');
  }
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

function createBaseUser(
  overrides: Partial<UserApi> &
    Pick<
      UserApi,
      | 'email'
      | 'password'
      | 'firstName'
      | 'lastName'
      | 'role'
      | 'activatedAt'
      | 'establishmentId'
    >
): UserApi {
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
      suspendedCause:
        'droits utilisateur expires, droits structure expires, cgu vides'
    }),
    // New suspension causes for Portail DF access verification
    createBaseUser({
      email: 'test.suspended.access@zlv.fr',
      password: hashedPassword,
      firstName: 'Suspendu',
      lastName: 'Niveau Accès',
      establishmentId: strasbourg.id,
      activatedAt: now,
      role: UserRole.USUAL,
      suspendedAt: now,
      suspendedCause: 'niveau_acces_invalide'
    }),
    createBaseUser({
      email: 'test.suspended.perimeter@zlv.fr',
      password: hashedPassword,
      firstName: 'Suspendu',
      lastName: 'Périmètre',
      establishmentId: saintLo.id,
      activatedAt: now,
      role: UserRole.USUAL,
      suspendedAt: now,
      suspendedCause: 'perimetre_invalide'
    }),
    createBaseUser({
      email: 'test.suspended.access.perimeter@zlv.fr',
      password: hashedPassword,
      firstName: 'Suspendu',
      lastName: 'Accès + Périmètre',
      establishmentId: strasbourg.id,
      activatedAt: now,
      role: UserRole.USUAL,
      suspendedAt: now,
      suspendedCause: 'niveau_acces_invalide, perimetre_invalide'
    }),
    // Deleted user - for testing account deletion (LOGIN-09)
    createBaseUser({
      email: 'test.deleted@zlv.fr',
      password: hashedPassword,
      firstName: 'Supprimé',
      lastName: 'Compte',
      establishmentId: strasbourg.id,
      activatedAt: now,
      role: UserRole.USUAL,
      deletedAt: now
    })
  ];
}

async function insertBaseUsers(
  knex: Knex,
  baseUsers: UserApi[]
): Promise<void> {
  console.log(`Inserting ${baseUsers.length} base users...`);
  await Users()
    .insert(baseUsers.map(toUserDBO))
    .onConflict('email')
    .merge(['establishment_id']);
  await syncToAuthUsers(knex, baseUsers);
}

async function generateRandomUsers(knex: Knex): Promise<void> {
  const establishments = await Establishments(knex).where({ available: true });
  const users = establishments.flatMap((establishments) => {
    return faker.helpers.multiple(() => genUserApi(establishments.id), {
      count: { min: 1, max: 10 }
    });
  });
  console.log(`Inserting ${users.length} random users...`);
  await knex.batchInsert(USERS_TABLE, users.map(toUserDBO));
  await syncToAuthUsers(knex, users);
  console.log('\n');
}

async function syncUserEstablishments(
  knex: Knex,
  { saintLo }: EstablishmentsData
): Promise<void> {
  await knex.raw(`
    INSERT INTO users_establishments (user_id, establishment_id, establishment_siren, has_commitment)
    SELECT
      u.id,
      u.establishment_id,
      e.siren,
      true
    FROM users u
    INNER JOIN establishments e ON e.id = u.establishment_id
    WHERE u.establishment_id IS NOT NULL
    AND u.deleted_at IS NULL
    ON CONFLICT (user_id, establishment_id) DO NOTHING
  `);

  const strasbourgUser = await Users(knex)
    .where({ email: 'test.strasbourg@zlv.fr' })
    .first();
  if (strasbourgUser) {
    await knex('users_establishments')
      .insert({
        user_id: strasbourgUser.id,
        establishment_id: saintLo.id,
        establishment_siren: saintLo.siren,
        has_commitment: true
      })
      .onConflict(['user_id', 'establishment_id'])
      .ignore();
  }
}

/**
 * Mirror inserted legacy users into `auth_users` and `account` so the
 * auth-v2 (better-auth) sign-in path works against the seeded dataset
 * without a separate `yarn workspace ... node backfill-auth-users` step.
 *
 * Mirrors the production `backfill-auth-users` script's contract:
 * - `auth_users.id` = legacy `users.id` (same UUID).
 * - Sign-in-capable users (not deleted, with a password) also get an `account` row
 *   with `provider_id='credential'` carrying the legacy bcrypt password.
 * - Suspended users keep their credential account so the frontend can show the
 *   suspension warning modal after login.
 */
async function syncToAuthUsers(knex: Knex, users: UserApi[]): Promise<void> {
  if (users.length === 0) return;

  const authUserRows = users.map((user) => {
    const fullName = [user.firstName, user.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .trim();
    return {
      id: user.id,
      name: fullName.length > 0 ? fullName : user.email,
      email: user.email.toLowerCase(),
      email_verified: true,
      created_at: user.activatedAt ?? user.updatedAt,
      updated_at: user.updatedAt
    };
  });
  await knex.batchInsert('auth_users', authUserRows);

  const accountRows = users
    .filter((user) => !user.deletedAt && user.password)
    .map((user) => ({
      id: randomUUID(),
      account_id: user.email.toLowerCase(),
      provider_id: 'credential',
      user_id: user.id,
      password: user.password
    }));
  if (accountRows.length > 0) {
    await knex.batchInsert('account', accountRows);
  }
}
