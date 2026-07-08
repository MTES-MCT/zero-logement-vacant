// End-to-end integration tests for the new better-auth sign-in flow (Task 10).
//
// IMPORTANT: Unlike `auth-controller.test.ts`, this file does NOT mock
// `~/infra/auth`. The real better-auth handler must process the request so we
// can verify cookie shape and absence of email enumeration.
//
// The seeding mirrors the production shape produced by the
// `backfill-auth-users` script: a legacy `users` row + matching `auth_users`
// row (same UUID) + `account` row holding the bcrypt hash. This is the only
// way better-auth can resolve a user that the `session.create.before` hook
// will accept (it requires a legacy `users` row with an `establishment_id`).
import { vi } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
    }))
  }
}));

vi.mock('../../services/mailService', () => ({
  default: {
    sendTwoFactorCode: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmail: vi.fn().mockResolvedValue(undefined),
    sendAccountActivationEmailFromLovac: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn()
  }
}));

vi.mock('../../services/ceremaService/mockCeremaService');

vi.mock('~/services/posthogService', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false),
  default: { isFeatureEnabled: vi.fn() }
}));

vi.mock('../../infra/config', async () => {
  const actual = await vi.importActual('../../infra/config');
  return {
    ...actual,
    default: {
      ...(actual as any).default,
      auth: {
        ...(actual as any).default.auth,
        admin2faEnabled: true
      }
    }
  };
});

vi.mock('~/services/ceremaService/userKindService', () => ({
  fetchUserKind: vi.fn().mockResolvedValue('gestionnaire')
}));

import { randomUUID } from 'node:crypto';

import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import request from 'supertest';

import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { SALT_LENGTH, UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

const AUTH_USERS_TABLE = 'auth_users';
const ACCOUNT_TABLE = 'account';
const TEST_2FA_CODE = '123456';

function getCookies(response: request.Response): string[] {
  const rawCookies = response.headers['set-cookie'];
  return (
    Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : []
  ) as string[];
}

async function seedBackfilledUser(opts: {
  email: string;
  plaintextPassword: string;
  establishmentId: string;
  role?: UserRole;
  deletedAt?: string | null;
  suspendedAt?: string | null;
  suspendedCause?: string | null;
}): Promise<UserApi> {
  const user: UserApi = {
    ...genUserApi(opts.establishmentId),
    email: opts.email,
    password: bcrypt.hashSync(opts.plaintextPassword, SALT_LENGTH),
    role: opts.role ?? UserRole.USUAL,
    kind: null,
    lastAuthenticatedAt: null,
    deletedAt: opts.deletedAt ?? null,
    suspendedAt: opts.suspendedAt ?? null,
    suspendedCause: opts.suspendedCause ?? null
  };
  await Users().insert(toUserDBO(user));

  // Mirror backfill-auth-users: same id, full_name from first+last, scrypt-
  // free `account` row holding the bcrypt hash so the verifier hook routes
  // through bcrypt at sign-in time.
  await db(AUTH_USERS_TABLE).insert({
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    email: user.email,
    email_verified: true,
    role:
      user.role === UserRole.ADMIN
        ? 'admin'
        : user.role === UserRole.VISITOR
          ? 'visitor'
          : 'usual',
    deleted_at: opts.deletedAt ?? null,
    suspended_at: opts.suspendedAt ?? null,
    suspended_cause: opts.suspendedCause ?? null
  });
  await db(ACCOUNT_TABLE).insert({
    id: randomUUID(),
    account_id: user.email,
    provider_id: 'credential',
    user_id: user.id,
    password: user.password
  });

  return user;
}

async function deleteBackfilledUser(userId: string): Promise<void> {
  await db('session').where({ user_id: userId }).delete();
  await db(ACCOUNT_TABLE).where({ user_id: userId }).delete();
  await db(AUTH_USERS_TABLE).where({ id: userId }).delete();
  await Users().where('id', userId).delete();
}

describe('better-auth sign-in (integration)', () => {
  let url: string;
  const establishment = genEstablishmentApi();

  beforeAll(async () => {
    url = await createServer().testing();
    await Establishments().insert(formatEstablishmentApi(establishment));
  });

  afterAll(async () => {
    await Establishments().where('id', establishment.id).delete();
  });

  it('sets an HttpOnly cookie on successful sign-in', async () => {
    const email = 'sign-in@zlv.fr';
    const password = 'not-a-real-password';

    const user = await seedBackfilledUser({
      email,
      plaintextPassword: password,
      establishmentId: establishment.id
    });

    try {
      const signInResponse = await request(url)
        .post('/auth/sign-in/email')
        .send({ email, password });

      expect(signInResponse.status).toBe(200);

      const cookies = getCookies(signInResponse);
      expect(cookies.length).toBeGreaterThan(0);

      const sessionCookie = cookies.find((c) =>
        c.includes('zlv.session_token')
      );
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      // better-auth defaults to SameSite=Lax (not Strict).
      expect(sessionCookie!.toLowerCase()).toContain('samesite=lax');
    } finally {
      await deleteBackfilledUser(user.id);
    }
  });

  it('returns identical error for unknown email and wrong password (no enumeration)', async () => {
    const email = 'real@zlv.fr';
    const password = 'not-a-real-password';

    const user = await seedBackfilledUser({
      email,
      plaintextPassword: password,
      establishmentId: establishment.id
    });

    try {
      const [unknownEmailResponse, wrongPasswordResponse] = await Promise.all([
        request(url)
          .post('/auth/sign-in/email')
          .send({ email: 'nobody@zlv.fr', password: 'AnyP@ssword1' }),
        request(url)
          .post('/auth/sign-in/email')
          .send({ email, password: 'WrongPassword1!' })
      ]);

      expect(unknownEmailResponse.status).toBeGreaterThanOrEqual(400);
      expect(wrongPasswordResponse.status).toBeGreaterThanOrEqual(400);
      expect(unknownEmailResponse.status).toBe(wrongPasswordResponse.status);
      expect(unknownEmailResponse.body).toEqual(wrongPasswordResponse.body);
    } finally {
      await deleteBackfilledUser(user.id);
    }
  });

  it('returns identical error for admin and non-admin wrong credentials', async () => {
    const password = 'not-a-real-password';
    const regularUser = await seedBackfilledUser({
      email: 'regular-enumeration@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id
    });
    const adminUser = await seedBackfilledUser({
      email: 'admin-enumeration@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN
    });

    try {
      const [unknownEmailResponse, wrongPasswordResponse, adminResponse] =
        await Promise.all([
          request(url)
            .post('/auth/sign-in/email')
            .send({ email: 'nobody-admin@zlv.fr', password: 'AnyP@ssword1' }),
          request(url).post('/auth/sign-in/email').send({
            email: regularUser.email,
            password: 'WrongPassword1!'
          }),
          request(url).post('/auth/sign-in/email').send({
            email: adminUser.email,
            password: 'WrongPassword1!'
          })
        ]);

      expect(unknownEmailResponse.status).toBeGreaterThanOrEqual(400);
      expect(wrongPasswordResponse.status).toBe(unknownEmailResponse.status);
      expect(adminResponse.status).toBe(unknownEmailResponse.status);
      expect(wrongPasswordResponse.body).toEqual(unknownEmailResponse.body);
      expect(adminResponse.body).toEqual(unknownEmailResponse.body);
    } finally {
      await deleteBackfilledUser(regularUser.id);
      await deleteBackfilledUser(adminUser.id);
    }
  });

  it('rejects admin users on the better-auth password endpoint', async () => {
    const email = 'admin-v2@zlv.fr';
    const password = 'not-a-real-password';

    const user = await seedBackfilledUser({
      email,
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN
    });

    try {
      const response = await request(url)
        .post('/auth/sign-in/email')
        .send({ email, password });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const cookies = getCookies(response);
      expect(cookies.some((c) => c.includes('zlv.session_token'))).toBe(false);
    } finally {
      await deleteBackfilledUser(user.id);
    }
  });

  it('starts admin better-auth sign-in with 2FA and no session cookie', async () => {
    const email = 'admin-start-v2@zlv.fr';
    const password = 'not-a-real-password';

    const user = await seedBackfilledUser({
      email,
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN
    });

    try {
      const response = await request(url).post('/auth/admin/sign-in').send({
        email,
        password,
        establishmentId: establishment.id
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        requiresTwoFactor: true,
        email
      });
      expect(getCookies(response).some((c) => c.includes('zlv.session_token'))).toBe(
        false
      );

      const updatedUser = await Users().where({ id: user.id }).first();
      expect(updatedUser?.two_factor_code).toEqual(expect.any(String));
      expect(updatedUser?.two_factor_code_generated_at).toBeInstanceOf(Date);
    } finally {
      await deleteBackfilledUser(user.id);
    }
  });

  it('returns identical errors on admin sign-in until credentials identify an active admin', async () => {
    const password = 'not-a-real-password';
    const regularUser = await seedBackfilledUser({
      email: 'regular-admin-signin@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id
    });
    const deletedAdmin = await seedBackfilledUser({
      email: 'deleted-admin-signin@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN,
      deletedAt: new Date().toJSON()
    });
    const activeAdmin = await seedBackfilledUser({
      email: 'active-admin-signin@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN
    });

    try {
      const [unknownEmail, nonAdmin, deleted, wrongPassword] =
        await Promise.all([
          request(url).post('/auth/admin/sign-in').send({
            email: 'unknown-admin-signin@zlv.fr',
            password,
            establishmentId: establishment.id
          }),
          request(url).post('/auth/admin/sign-in').send({
            email: regularUser.email,
            password,
            establishmentId: establishment.id
          }),
          request(url).post('/auth/admin/sign-in').send({
            email: deletedAdmin.email,
            password,
            establishmentId: establishment.id
          }),
          request(url).post('/auth/admin/sign-in').send({
            email: activeAdmin.email,
            password: 'WrongPassword1!',
            establishmentId: establishment.id
          })
        ]);

      expect(unknownEmail.status).toBeGreaterThanOrEqual(400);
      expect(nonAdmin.status).toBe(unknownEmail.status);
      expect(deleted.status).toBe(unknownEmail.status);
      expect(wrongPassword.status).toBe(unknownEmail.status);
      expect(nonAdmin.body).toEqual(unknownEmail.body);
      expect(deleted.body).toEqual(unknownEmail.body);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
    } finally {
      await deleteBackfilledUser(regularUser.id);
      await deleteBackfilledUser(deletedAdmin.id);
      await deleteBackfilledUser(activeAdmin.id);
    }
  });

  it('returns identical errors on admin 2FA until the challenge identifies an active admin', async () => {
    const password = 'not-a-real-password';
    const regularUser = await seedBackfilledUser({
      email: 'regular-admin-2fa@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id
    });
    const deletedAdmin = await seedBackfilledUser({
      email: 'deleted-admin-2fa@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN,
      deletedAt: new Date().toJSON()
    });
    const activeAdmin = await seedBackfilledUser({
      email: 'active-admin-2fa@zlv.fr',
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN
    });

    try {
      const challenge = await request(url).post('/auth/admin/sign-in').send({
        email: activeAdmin.email,
        password,
        establishmentId: establishment.id
      });
      expect(challenge.status).toBe(200);

      const [unknownEmail, nonAdmin, deleted, wrongCode] = await Promise.all([
        request(url).post('/auth/admin/verify-2fa').send({
          email: 'unknown-admin-2fa@zlv.fr',
          code: TEST_2FA_CODE,
          establishmentId: establishment.id
        }),
        request(url).post('/auth/admin/verify-2fa').send({
          email: regularUser.email,
          code: TEST_2FA_CODE,
          establishmentId: establishment.id
        }),
        request(url).post('/auth/admin/verify-2fa').send({
          email: deletedAdmin.email,
          code: TEST_2FA_CODE,
          establishmentId: establishment.id
        }),
        request(url).post('/auth/admin/verify-2fa').send({
          email: activeAdmin.email,
          code: '000000',
          establishmentId: establishment.id
        })
      ]);

      expect(unknownEmail.status).toBeGreaterThanOrEqual(400);
      expect(nonAdmin.status).toBe(unknownEmail.status);
      expect(deleted.status).toBe(unknownEmail.status);
      expect(wrongCode.status).toBe(unknownEmail.status);
      expect(nonAdmin.body).toEqual(unknownEmail.body);
      expect(deleted.body).toEqual(unknownEmail.body);
      expect(wrongCode.body).toEqual(unknownEmail.body);
    } finally {
      await deleteBackfilledUser(regularUser.id);
      await deleteBackfilledUser(deletedAdmin.id);
      await deleteBackfilledUser(activeAdmin.id);
    }
  });

  it('creates a better-auth admin session after a valid 2FA code', async () => {
    const email = 'admin-verify-v2@zlv.fr';
    const password = 'not-a-real-password';

    const user = await seedBackfilledUser({
      email,
      plaintextPassword: password,
      establishmentId: establishment.id,
      role: UserRole.ADMIN
    });

    try {
      const challenge = await request(url).post('/auth/admin/sign-in').send({
        email,
        password,
        establishmentId: establishment.id
      });
      expect(challenge.status).toBe(200);

      const verify = await request(url).post('/auth/admin/verify-2fa').send({
        email,
        code: TEST_2FA_CODE,
        establishmentId: establishment.id
      });

      expect(verify.status).toBe(200);
      const cookies = getCookies(verify);
      expect(cookies.some((c) => c.includes('zlv.session_token'))).toBe(true);

      const session = await request(url).get('/auth/get-session').set('Cookie', cookies);
      expect(session.status).toBe(200);
      expect(session.body).toMatchObject({
        user: {
          id: user.id,
          email,
          role: 'admin'
        },
        session: {
          activeEstablishmentId: establishment.id
        },
        establishment: {
          id: establishment.id
        }
      });

      const updatedUser = await Users().where({ id: user.id }).first();
      expect(updatedUser?.two_factor_code).toBeNull();
      expect(updatedUser?.two_factor_code_generated_at).toBeNull();
      expect(updatedUser?.last_authenticated_at).toBeInstanceOf(Date);
    } finally {
      await deleteBackfilledUser(user.id);
    }
  });

  it('does not expose public better-auth email sign-up', async () => {
    const email = 'public-signup@zlv.fr';

    const response = await request(url).post('/auth/sign-up/email').send({
      name: 'Public Signup',
      email,
      password: 'not-a-real-password'
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'EMAIL_PASSWORD_SIGN_UP_DISABLED'
    });

    const authUser = await db(AUTH_USERS_TABLE).where({ email }).first();
    expect(authUser).toBeUndefined();
  });

  it('allows suspended users to sign in so the warning modal can render', async () => {
    const email = 'suspended-v2@zlv.fr';
    const password = 'not-a-real-password';
    const suspendedAt = new Date().toJSON();

    const user = await seedBackfilledUser({
      email,
      plaintextPassword: password,
      establishmentId: establishment.id,
      suspendedAt,
      suspendedCause: 'droits utilisateur expires'
    });

    try {
      const response = await request(url)
        .post('/auth/sign-in/email')
        .send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        email,
        suspendedAt,
        suspendedCause: 'droits utilisateur expires'
      });
    } finally {
      await deleteBackfilledUser(user.id);
    }
  });

  it('persists user kind and last authentication date on better-auth sign-in', async () => {
    const email = 'metadata-v2@zlv.fr';
    const password = 'not-a-real-password';

    const user = await seedBackfilledUser({
      email,
      plaintextPassword: password,
      establishmentId: establishment.id
    });

    try {
      const response = await request(url)
        .post('/auth/sign-in/email')
        .send({ email, password });

      expect(response.status).toBe(200);

      const legacyUser = await db('users').where({ id: user.id }).first();
      expect(legacyUser.kind).toBe('gestionnaire');
      expect(legacyUser.last_authenticated_at).toBeInstanceOf(Date);

      const authUser = await db(AUTH_USERS_TABLE).where({ id: user.id }).first();
      expect(authUser.kind).toBe('gestionnaire');
      expect(authUser.last_authenticated_at).toBeInstanceOf(Date);
    } finally {
      await deleteBackfilledUser(user.id);
    }
  });
});
