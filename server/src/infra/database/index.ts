import { Knex, knex } from 'knex';
import fp from 'lodash/fp';

import config from '~/infra/database/knexfile';
import { compact } from '~/utils/object';

const db = knex(config);

export function notDeleted(builder: Knex.QueryBuilder<{ deleted_at: Date }>) {
  builder.whereNull('deleted_at');
}

export function likeUnaccent(column: string, query: string) {
  return db.raw(
    `upper(unaccent(${column})) like '%' || upper(unaccent(?)) || '%'`,
    query
  );
}

export async function countQuery(query: Knex.QueryInterface): Promise<number> {
  const result = await query.count().first();
  return Number(result.count);
}

interface WhereOptions {
  /**
   * A table name to prefix columns and avoid ambiguity.
   */
  table?: string;
}

export function where<T>(props: Array<keyof T>, opts?: WhereOptions) {
  return fp.pipe(
    fp.pick(props),
    compact,
    fp.mapKeys(
      fp.pipe(fp.snakeCase, (key) =>
        opts?.table ? `${opts?.table}.${key}` : key
      )
    )
  );
}

export function groupBy<T>(props?: Array<keyof T>) {
  return (query: Knex.QueryBuilder) => {
    if (props?.length) {
      return query.distinctOn(...props);
    }
  };
}

export default db;
