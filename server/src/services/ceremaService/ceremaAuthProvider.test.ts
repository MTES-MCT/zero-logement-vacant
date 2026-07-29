import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import config from '~/infra/config';

import { authenticate } from './ceremaAuthProvider';

beforeEach(() => {
  nock.cleanAll();
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('authenticate', () => {
  it('rejects an authentication response without an access token', async () => {
    nock(config.cerema.api)
      .post('/api/token/')
      .reply(200, { refresh: 'refresh-token' });

    await expect(authenticate()).rejects.toThrow(
      'Cerema authentication response has no access token'
    );
  });
});
