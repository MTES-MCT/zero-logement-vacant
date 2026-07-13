import request from 'supertest';
import { describe, expect, it } from 'vitest';

import config from '../config';
import { createServer } from '../server';

describe('CORS preflight', () => {
  it('allows tracing headers requested by the frontend', async () => {
    const server = createServer();
    const origin = config.app.allowedOrigins[0]!;
    const requestedHeaders = 'content-type,sentry-trace,baggage';
    const url = await server.testing();

    try {
      const response = await request(url)
        .options('/auth/get-session')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', requestedHeaders);

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-headers']).toBe(
        requestedHeaders
      );
    } finally {
      await server.stop();
    }
  });
});
