import { constants } from 'http2';
import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { SALT_LENGTH, UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import { createTestToken } from '~/test/testUtils';

vi.mock('../../services/ceremaService/mockCeremaService');

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

describe('Protected router cookie authentication', () => {
  let url: string;
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    url = await createServer().testing();
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  afterAll(async () => {
    await Users().where('id', user.id).delete();
    await Establishments().where('id', establishment.id).delete();
  });

  it('rejects a valid legacy JWT', async () => {
    const token = createTestToken({
      userId: user.id,
      establishmentId: establishment.id
    });

    const { status } = await request(url)
      .get('/account')
      .set('x-access-token', token);

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });

  it('rejects an invalid session cookie', async () => {
    const { status } = await request(url)
      .get('/account')
      .set('Cookie', 'zlv.session_token=not-a-real-token');

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });

  it('rejects a session whose absolute lifetime reached thirty days', async () => {
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

  it('rejects requests without credentials', async () => {
    const { status } = await request(url).get('/account');

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });
});
