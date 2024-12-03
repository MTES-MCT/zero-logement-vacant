import { Knex, knex } from 'knex';
import fp from 'lodash/fp';
import { match } from 'ts-pattern';

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

export interface ConflictOptions<T> {
  onConflict: ReadonlyArray<keyof T>;
  merge: boolean | ReadonlyArray<keyof T>;
}

export function onConflict<T extends object>(opts: ConflictOptions<T>) {
  return (query: Knex.QueryBuilder): void => {
    if (opts.onConflict.length === 0) {
      throw new Error('onConflict must have at least one column');
    }

    const onConflict = opts.onConflict as ReadonlyArray<string>;
    match(opts.merge)
      .returnType<void>()
      .with(false, () => query.onConflict(onConflict).ignore())
      .with(true, () => query.onConflict(onConflict).merge())
      .otherwise((columns) => query.onConflict(onConflict).merge(columns));
  };
}

export function toRawArray<A>(items: ReadonlyArray<A>): string {
  const bindings = items.map(() => '?').join(', ');
  return `(${bindings})`;
}

export default db;
