import { constants } from 'node:http2';

import nock from 'nock';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  error: vi.fn()
}));

vi.mock('~/infra/logger', () => ({
  createLogger: () => mockLogger
}));

import { createMetabaseAPI } from '../metabase-api';

const METABASE_URL = 'http://metabase.test';
const API_TOKEN = 'secret-api-token';

describe('MetabaseAPI', () => {
  afterEach(() => {
    nock.cleanAll();
    mockLogger.error.mockReset();
  });

  it('logs a sanitized context when Metabase rejects a request', async () => {
    nock(METABASE_URL)
      .get('/api/dashboard/38')
      .reply(503, { message: 'secret-upstream-body' });
    const metabase = createMetabaseAPI({
      domain: METABASE_URL,
      apiToken: API_TOKEN
    });

    await expect(metabase.fetchDashboardRaw(38)).rejects.toMatchObject({
      name: 'BadGatewayError',
      message: 'Metabase request failed',
      status: constants.HTTP_STATUS_BAD_GATEWAY
    });
    expect(mockLogger.error).toHaveBeenCalledWith('Metabase request failed', {
      upstream: 'metabase',
      code: 'ERR_BAD_RESPONSE',
      status: 503,
      method: 'GET',
      path: '/api/dashboard/38'
    });

    const serializedLogs = JSON.stringify(mockLogger.error.mock.calls);
    expect(serializedLogs).not.toContain(API_TOKEN);
    expect(serializedLogs).not.toContain('X-Api-Key');
    expect(serializedLogs).not.toContain('secret-upstream-body');
  });

  it('logs a sanitized context when a Metabase card query times out', async () => {
    nock(METABASE_URL)
      .post('/api/dashboard/38/dashcard/929/card/771/query')
      .replyWithError(
        Object.assign(new Error('secret-timeout-message'), {
          code: 'ECONNABORTED'
        })
      );
    const metabase = createMetabaseAPI({
      domain: METABASE_URL,
      apiToken: API_TOKEN
    });

    await expect(
      metabase.getCardValue(
        38,
        929,
        771,
        [
          {
            id: 'establishment-id',
            slug: 'id',
            type: 'string/=',
            value: 'secret-establishment'
          }
        ],
        null,
        null,
        'flat-number',
        null,
        'number',
        0,
        null
      )
    ).rejects.toMatchObject({
      name: 'GatewayTimeoutError',
      message: 'Metabase query timed out',
      status: constants.HTTP_STATUS_GATEWAY_TIMEOUT
    });
    expect(mockLogger.error).toHaveBeenCalledWith('Metabase request failed', {
      upstream: 'metabase',
      code: 'ECONNABORTED',
      status: null,
      method: 'POST',
      path: '/api/dashboard/38/dashcard/929/card/771/query'
    });

    const serializedLogs = JSON.stringify(mockLogger.error.mock.calls);
    expect(serializedLogs).not.toContain(API_TOKEN);
    expect(serializedLogs).not.toContain('X-Api-Key');
    expect(serializedLogs).not.toContain('secret-establishment');
    expect(serializedLogs).not.toContain('secret-timeout-message');
  });
});
