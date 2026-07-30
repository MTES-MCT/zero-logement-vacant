import { pipe, Predicate, Record, Struct } from 'effect';
import { camelToSnake } from 'effect/String';
import knex, { Knex } from 'knex';
import { match } from 'ts-pattern';

import config from '~/infra/database/knexfile';

const db = knex(config);

interface WhereOptions {
  /**
   * A table name to prefix columns and avoid ambiguity.
   */
  table?: string;
}

export function where<T extends object>(
  props: Array<keyof T>,
  opts?: WhereOptions
) {
  return (values: T): Record<string, unknown> => {
    const keys = Struct.keys(values).filter((key) => props.includes(key));
    return pipe(
      values,
      Struct.pick(...keys),
      (value) => value as Record<string, unknown>,
      Record.filter(Predicate.isNotUndefined),
      Record.mapKeys((key) => {
        return pipe(key, camelToSnake, (key: string) =>
          opts?.table ? `${opts?.table}.${key}` : key
        );
      })
    );
  };
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

export function fromDateDBO(date: Date | string): string {
  return Predicate.isDate(date) ? date.toJSON() : date;
}

export function toDateDBO(date: Date | string): Date {
  return Predicate.isDate(date) ? date : new Date(date);
}

export default db;
