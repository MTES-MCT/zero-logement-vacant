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
import Cursor from 'pg-cursor';

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
  dialect: new PostgresDialect({ pool, cursor: Cursor }),
  plugins: [
    // maintainNestedObjectKeys keeps keys inside JSON aggregates
    // (`to_json(users.*)`, `to_json(senders.*)`, `jsonb_build_object(...)`)
    // untouched, so the snake_case DBO parsers (fromUserDBO, parseSenderApi,
    // fromDocumentDBO) still read them. Without it the plugin recursively
    // camelCases nested JSON and those parsers get undefined.
    new CamelCasePlugin({ maintainNestedObjectKeys: true }),
    new DeduplicateJoinsPlugin(),
    new SafeNullComparisonPlugin(),
    new HandleEmptyInListsPlugin({
      strategy: replaceWithNoncontingentExpression
    })
  ]
});
