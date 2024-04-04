import { Knex, knex } from 'knex';

import config from '~/infra/database/knexfile';

const db = knex(config);

export function notDeleted(builder: Knex.QueryBuilder<{ deleted_at: Date }>) {
  builder.whereNull('deleted_at');
}

export default db;
