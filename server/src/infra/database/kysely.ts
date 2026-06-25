import {
  Kysely,
  PostgresDialect,
  CamelCasePlugin,
  DeduplicateJoinsPlugin,
  SafeNullComparisonPlugin,
  HandleEmptyInListsPlugin,
  replaceWithNoncontingentExpression
} from 'kysely';
import pg from 'pg';

import type { DB } from '~/infra/database/db';
import config from '~/infra/database/knexfile';

// Return DATE columns as "YYYY-MM-DD" strings instead of local-timezone Date objects.
// node-postgres uses new Date(year, month, day) for OID 1082, which shifts the day
// by -1 in UTC+1 servers (CET). A plain string avoids all timezone arithmetic.
pg.types.setTypeParser(pg.types.builtins.DATE, (val) => val);

const pool = new pg.Pool({
  connectionString: config.connection as string,
  max: config.pool?.max
});

export const kysely = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
  plugins: [
    new CamelCasePlugin(),
    new DeduplicateJoinsPlugin(),
    new SafeNullComparisonPlugin(),
    new HandleEmptyInListsPlugin({
      strategy: replaceWithNoncontingentExpression
    })
  ]
});
