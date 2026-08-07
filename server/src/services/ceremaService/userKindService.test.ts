import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import config from '~/infra/config';

import { fetchUserKind } from './userKindService';

const ACCESS_TOKEN = 'access-token';
const originalCeremaEnabled = config.cerema.enabled;

beforeEach(() => {
  config.cerema.enabled = true;
  nock.cleanAll();
  nock.disableNetConnect();
});

afterEach(() => {
  config.cerema.enabled = originalCeremaEnabled;
  nock.cleanAll();
  nock.enableNetConnect();
  vi.unstubAllGlobals();
});

describe('fetchUserKind', () => {
  it('uses the JWT access token as a Bearer credential', async () => {
    const email = 'user+test@example.com';
    const authScope = nock(config.cerema.api)
      .post('/api/token/')
      .reply(200, { access: ACCESS_TOKEN, refresh: 'refresh-token' });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id_user: 1,
              email,
              exterieur: false,
              gestionnaire: true
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchUserKind(email);

    expect(result).toBe('gestionnaire');
    expect(authScope.isDone()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${config.cerema.api}/api/utilisateurs?email=user%2Btest%40example.com`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${ACCESS_TOKEN}`
        })
      })
    );
  });
});
