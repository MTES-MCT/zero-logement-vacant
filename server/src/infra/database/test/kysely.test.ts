import { sql } from 'kysely';
import pg from 'pg';

import db from '~/infra/database';
import config from '~/infra/database/knexfile';
import { kysely, pool } from '~/infra/database/kysely';

describe('Kysely pool', () => {
  it('parses DATE columns as plain strings for Kysely queries only, leaving Knex/global pg reads as Date objects', async () => {
    const kyselyRow = await kysely
      .selectNoFrom(sql<string>`'2024-03-15'::date`.as('d'))
      .executeTakeFirstOrThrow();
    expect(kyselyRow.d).toBe('2024-03-15');

    const knexRow = await db.raw("select '2024-03-15'::date as d");
    expect(knexRow.rows[0].d).toBeInstanceOf(Date);

    const globalPgClient = new pg.Client({
      connectionString: config.connection as string
    });
    await globalPgClient.connect();
    try {
      const rawPgRow = await globalPgClient.query(
        "select '2024-03-15'::date as d"
      );
      expect(rawPgRow.rows[0].d).toBeInstanceOf(Date);
    } finally {
      await globalPgClient.end();
    }
  });

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
