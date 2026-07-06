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

async function seedBackfilledUser(opts: {
  email: string;
  plaintextPassword: string;
  establishmentId: string;
  role?: UserRole;
  suspendedAt?: string | null;
  suspendedCause?: string | null;
}): Promise<UserApi> {
  const user: UserApi = {
    ...genUserApi(opts.establishmentId),
    email: opts.email,
    password: bcrypt.hashSync(opts.plaintextPassword, SALT_LENGTH),
    role: opts.role ?? UserRole.USUAL,
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

      const rawCookies = signInResponse.headers['set-cookie'];
      const cookies = (
        Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : []
      ) as string[];
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
      const rawCookies = response.headers['set-cookie'];
      const cookies = (
        Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : []
      ) as string[];
      expect(cookies.some((c) => c.includes('zlv.session_token'))).toBe(false);
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
});
