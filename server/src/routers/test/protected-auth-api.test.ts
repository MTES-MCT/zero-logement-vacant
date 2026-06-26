// Integration tests for the protected router's transition-window auth dispatch
// (`server/src/routers/protected.ts`): the better-auth cookie session is tried
// first, then the request falls back to the legacy JWT. The key regression
// guarded here is that an INVALID/expired session cookie must NOT block the
// JWT fallback — it previously caused a hard 401.
import { constants } from 'http2';

import { UserRole } from '@zerologementvacant/models';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createServer } from '~/infra/server';
import { UserApi } from '~/models/UserApi';
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

describe('Protected router auth (session-first, JWT fallback)', () => {
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

  it('responds 401 when the session cookie is invalid and no JWT is provided', async () => {
    const { status } = await request(url)
      .get('/account')
      .set('Cookie', INVALID_SESSION_COOKIE);

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });

  it('responds 401 when no credentials are provided', async () => {
    const { status } = await request(url).get('/account');

    expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
  });
});
