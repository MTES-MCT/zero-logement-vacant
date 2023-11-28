import { AsyncLocalStorage } from 'async_hooks';
import knex, { Knex } from 'knex';
import fp from 'lodash/fp';

import knexConfig from '../knex';
import { compact } from '../utils/object';
import { logger } from '../utils/logger';

export const notDeleted: Knex.QueryCallback = (builder) =>
  builder.whereNull('deleted_at');

export const likeUnaccent = (column: string, query: string) => {
  return knex(knexConfig).raw(
    `upper(unaccent(${column})) like '%' || upper(unaccent(?)) || '%'`,
    query
  );
};

export async function countQuery(query: Knex.QueryInterface): Promise<number> {
  const result = await query.count().first();
  return Number(result.count);
}

export const where = <T>(props: Array<keyof T>, opts?: WhereOptions) =>
  fp.pipe(
    fp.pick(props),
    compact,
    fp.mapKeys(
      fp.pipe(fp.snakeCase, (key) =>
        opts?.table ? `${opts?.table}.${key}` : key
      )
    )
  );

interface WhereOptions {
  /**
   * A table name to prefix columns and avoid ambiguity.
   */
  table?: string;
}

interface Store {
  id: string;
  transaction: Knex.Transaction;
}

export const storage = new AsyncLocalStorage<Store>();

export function getCurrentTransaction(): Store | null {
  const store = storage.getStore();
  logger.debug({ id: store?.id }, `Using transaction`);
  return store ?? null;
}

export const db = knex(knexConfig);

export default db;
