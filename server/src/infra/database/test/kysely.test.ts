import pg from 'pg';

import config from '~/infra/database/knexfile';
import { pool } from '~/infra/database/kysely';

describe('Kysely pool', () => {
  it('mirrors Knex acquireConnectionTimeout as the pg connection timeout', () => {
    expect(pool.options.connectionTimeoutMillis).toBe(
      config.acquireConnectionTimeout
    );
    // Guards against the timeout silently going missing, which would let a
    // saturated pool leave checkouts pending indefinitely.
    expect(config.acquireConnectionTimeout).toBeGreaterThan(0);
  });

  it('rejects a checkout that exceeds the pool size instead of hanging', async () => {
    const timeout = 500;
    const saturated = new pg.Pool({
      connectionString: config.connection as string,
      max: 1,
      connectionTimeoutMillis: timeout
    });

    const held = await saturated.connect();
    try {
      const start = performance.now();
      await expect(saturated.connect()).rejects.toThrow(/timeout/i);
      expect(performance.now() - start).toBeLessThan(timeout * 4);
    } finally {
      held.release();
      await saturated.end();
    }
  }, 10_000);
});
