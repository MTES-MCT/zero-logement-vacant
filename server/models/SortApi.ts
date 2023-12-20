import { query, ValidationChain } from 'express-validator';
import { Knex } from 'knex';

import { keys } from '../utils/object';
import validator from 'validator';
import { isArrayOf, isString } from '../utils/validators';

type Direction = 'asc' | 'desc';
export type Sort<Sortable extends object = object> = Partial<
  Record<keyof Sortable, Direction>
>;

/**
 * Parse sort query string array to an object.
 * The query format is assumed to be validated at route-level.
 * @param query
 *
 * @example
 * const sort = parse('owner,-rawAddress')
 * // { owner: 'asc', rawAddress: 'desc' }
 */
function parse<Sortable extends object = object>(
  query?: string[] | string
): Sort<Sortable> | undefined {
  if (!query) {
    return;
  }

  return (typeof query === 'string' ? [query] : query)
    .map((key) => {
      if (key.startsWith('-')) {
        const keyWithoutMinus = key.slice(1) as keyof Sortable;
        return { [keyWithoutMinus]: 'desc' } as Record<
          keyof Sortable,
          Direction
        >;
      }
      return { [key]: 'asc' } as Record<keyof Sortable, Direction>;
    })
    .reduce((sort, entry) => {
      return { ...sort, ...entry };
    }, {});
}

interface FormatOptions<Sortable> {
  keys?: Partial<Record<keyof Sortable, (query: Knex.QueryBuilder) => void>>;
  default?: (query: Knex.QueryBuilder) => void;
}

export function sortQuery<Sortable extends object>(
  sort?: Sort<Sortable>,
  options?: FormatOptions<Sortable>
) {
  return (query: Knex.QueryBuilder): void => {
    if (sort) {
      keys(sort).forEach((key) => {
        options?.keys?.[key]?.(query);
      });
    } else {
      options?.default?.(query);
    }
  };
}

export const queryValidators: ValidationChain[] = [
  query('sort')
    .optional()
    .custom((value) => isSortValue(value) || isArrayOf(isSortValue)(value)),
];

const isSortValue = (value: unknown): value is string =>
  isString(value) && validator.matches(value, /^-?[a-zA-Z]+$/i);

export default {
  parse,
  query: sortQuery,
  queryValidators,
};
