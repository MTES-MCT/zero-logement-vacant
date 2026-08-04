import { describe, expect, it } from 'vitest';

import { sanitizeEvent } from '../sentry';

describe('Sentry', () => {
  it('should remove authentication secrets from events', () => {
    const token = 'C'.repeat(100);
    const password = 'MotDePasse123';

    const event = sanitizeEvent({
      transaction: `GET /reset-links/${token}`,
      request: {
        url: `https://example.test/reset-links/${token}`,
        data: { key: token, password },
        headers: { authorization: `Bearer ${token}` },
        cookies: { session: token },
        query_string: `token=${token}`
      },
      breadcrumbs: [
        {
          category: 'fetch',
          data: { url: `https://example.test/reset-links/${token}` }
        }
      ],
      sdkProcessingMetadata: {
        request: { body: { key: token, password } }
      }
    });

    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(password);
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.headers).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
    expect(event.sdkProcessingMetadata).toBeUndefined();
  });
});
