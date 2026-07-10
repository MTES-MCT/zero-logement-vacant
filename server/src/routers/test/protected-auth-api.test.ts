// Integration tests for the protected router's transition-window auth dispatch
// (`server/src/routers/protected.ts`): explicit legacy JWT credentials keep
// precedence during the transition, while invalid/expired session cookies still
// fall back to JWT instead of causing a hard 401.
import { vi } from 'vitest';

vi.mock('../../services/ceremaService/mockCeremaService');

import { constants } from 'http2';
import { randomUUID } from 'node:crypto';

import { UserRole } from '@zerologementvacant/models';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { SALT_LENGTH, UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

// A syntactically-present but unverifiable better-auth session cookie:
// getSession resolves it to null (no valid session) — exactly the expired or
// revoked case.
const INVALID_SESSION_COOKIE = 'zlv.session_token=not-a-real-token';

async function seedBackfilledUser(
  establishmentId: string,
  plaintextPassword: string
): Promise<UserApi> {
  const user: UserApi = {
    ...genUserApi(establishmentId),
    email: `session-${randomUUID()}@zlv.fr`,
    password: await bcrypt.hash(plaintextPassword, SALT_LENGTH)
  };

  await Users().insert(toUserDBO(user));
  await db('auth_users').insert({
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    email: user.email,
    email_verified: true,
    role: 'usual'
  });
  await db('account').insert({
    id: randomUUID(),
    account_id: user.email,
    provider_id: 'credential',
    user_id: user.id,
    password: user.password
  });

  return user;
}

describe('Protected router auth (JWT precedence, session fallback)', () => {
  let url: string;
  const establishment = genEstablishmentApi();
  const user: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.USUAL
  };

  beforeAll(async () => {
    url = await createServer().testing();
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  afterAll(async () => {
    await Users().where('id', user.id).delete();
    await Establishments().where('id', establishment.id).delete();
  });

  it('authenticates via JWT when no session cookie is present', async () => {
    const { status } = await request(url)
      .get('/account')
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
  });

  it('falls back to JWT when the session cookie is invalid', async () => {
    // An unusable session cookie alongside a valid JWT: the invalid session
    // must not short-circuit to 401 — the request still authenticates via JWT.
    const { status } = await request(url)
      .get('/account')
      .set('Cookie', INVALID_SESSION_COOKIE)
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
  });

  it('uses the explicit JWT user when a valid session cookie belongs to another user', async () => {
    const password = 'not-a-real-password';
    const otherEstablishment = genEstablishmentApi();
    await Establishments().insert(formatEstablishmentApi(otherEstablishment));
    const sessionUser = await seedBackfilledUser(
      otherEstablishment.id,
      password
    );

    try {
      await expect(
        db('auth_users').where({ email: sessionUser.email }).first()
      ).resolves.toBeDefined();

      const signIn = await request(url)
        .post('/auth/sign-in/email')
        .send({ email: sessionUser.email, password });
      expect(signIn.status).toBe(constants.HTTP_STATUS_OK);

      const rawCookies = signIn.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies)
        ? rawCookies
        : rawCookies
          ? [rawCookies]
          : [];
      expect(
        cookies.some((cookie) => cookie.includes('zlv.session_token'))
      ).toBe(true);

      const { body, status } = await request(url)
        .get('/users')
        .set('Cookie', cookies)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll(
        (listedUser: UserApi) => listedUser.establishmentId === establishment.id
      );
      expect(
        body.some((listedUser: UserApi) => listedUser.id === user.id)
      ).toBe(true);
      expect(
        body.some((listedUser: UserApi) => listedUser.id === sessionUser.id)
      ).toBe(false);
    } finally {
      await db('session').where({ user_id: sessionUser.id }).delete();
      await db('account').where({ user_id: sessionUser.id }).delete();
      await db('auth_users').where({ id: sessionUser.id }).delete();
      await Users().where('id', sessionUser.id).delete();
      await Establishments().where('id', otherEstablishment.id).delete();
    }
  });

  it('responds 401 when the session cookie is invalid and no JWT is provided', async () => {
    const { status } = await request(url)
      .get('/account')
      .set('Cookie', INVALID_SESSION_COOKIE);

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });

  it('responds 401 when an active session reaches thirty days old', async () => {
    const password = 'not-a-real-password';
    const sessionUser = await seedBackfilledUser(establishment.id, password);

    try {
      const signIn = await request(url)
        .post('/auth/sign-in/email')
        .send({ email: sessionUser.email, password });
      expect(signIn.status).toBe(constants.HTTP_STATUS_OK);

      const rawCookies = signIn.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies)
        ? rawCookies
        : rawCookies
          ? [rawCookies]
          : [];
      const sessionTokenCookie = cookies
        .find((cookie) => cookie.includes('zlv.session_token'))
        ?.split(';')[0];
      expect(sessionTokenCookie).toBeDefined();

      const now = Date.now();
      await db('session')
        .where({ user_id: sessionUser.id })
        .update({
          created_at: new Date(now - (30 * 24 * 60 * 60 * 1000 + 60_000)),
          updated_at: new Date(now),
          expires_at: new Date(now + 7 * 60 * 60 * 1000)
        });

      const { status } = await request(url)
        .get('/account')
        .set('Cookie', sessionTokenCookie!);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    } finally {
      await db('session').where({ user_id: sessionUser.id }).delete();
      await db('account').where({ user_id: sessionUser.id }).delete();
      await db('auth_users').where({ id: sessionUser.id }).delete();
      await Users().where('id', sessionUser.id).delete();
    }
  });

  it('responds 401 when no credentials are provided', async () => {
    const { status } = await request(url).get('/account');

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });
});
