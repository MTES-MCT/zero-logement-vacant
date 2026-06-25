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
}): Promise<UserApi> {
  const user: UserApi = {
    ...genUserApi(opts.establishmentId),
    email: opts.email,
    password: bcrypt.hashSync(opts.plaintextPassword, SALT_LENGTH)
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
    role: 'usual'
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

  beforeEach(async () => {
    // Clean better-auth tables in dependency order (children first).
    await db('session').del();
    await db('account').del();
    await db('auth_users').del();
  });

  it('sets an HttpOnly cookie on successful sign-in', async () => {
    const email = 'sign-in@zlv.fr';
    const password = 'ValidP@ssword1';

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
      await Users().where('id', user.id).delete();
    }
  });

  it('returns identical error for unknown email and wrong password (no enumeration)', async () => {
    const email = 'real@zlv.fr';
    const password = 'ValidP@ssword1';

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
      await Users().where('id', user.id).delete();
    }
  });
});
