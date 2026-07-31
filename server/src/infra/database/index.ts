import { Predicate } from 'effect';
import knex from 'knex';

import config from '~/infra/database/knexfile';

const db = knex(config);

export interface ConflictOptions<T> {
  onConflict: ReadonlyArray<keyof T>;
  merge: boolean | ReadonlyArray<keyof T>;
}

export function fromDateDBO(date: Date | string): string {
  return Predicate.isDate(date) ? date.toJSON() : date;
}

export function toDateDBO(date: Date | string): Date {
  return Predicate.isDate(date) ? date : new Date(date);
}

export default db;
