import { Pagination } from '@zerologementvacant/models';
import { query, ValidationChain } from 'express-validator';
import { Knex } from 'knex';

import schemas, { MAX_PER_PAGE } from '@zerologementvacant/schemas';

export { MAX_PER_PAGE };

export type PaginationApi = PaginationEnabled | PaginationDisabled;

export interface PaginationEnabled {
  paginate?: true;
  page: number;
  perPage: number;
}

export interface PaginationDisabled {
  paginate: false;
}

export const isPaginationEnabled = (
  pagination?: PaginationApi
): pagination is PaginationEnabled => pagination?.paginate !== false;

export const queryValidators: ValidationChain[] = [
  query('paginate').default(true).isBoolean(),
  query('page').default(1).isInt({ min: 1 }).toInt(10),
  query('perPage').default(50).isInt({ min: 1, max: MAX_PER_PAGE }).toInt(10)
];

export const paginationSchema = schemas.pagination;

/**
 * Create pagination from a parsed query object.
 * Validate input before using this function!
 * @param query
 */
export function createPagination(query: Pagination): PaginationApi {
  return query.paginate
    ? {
        paginate: true,
        page: query.page,
        perPage: query.perPage
      }
    : { paginate: false };
}

export function paginationQuery(
  pagination: PaginationApi = { paginate: true, page: 1, perPage: 50 }
) {
  return (builder: Knex.QueryBuilder): void => {
    if (isPaginationEnabled(pagination)) {
      const { page, perPage } = pagination;
      builder.offset((page - 1) * perPage).limit(perPage);
    }
  };
}

// Alias the function
export { paginationQuery as paginate };

export default {
  create: createPagination,
  query: paginationQuery,
  queryValidators,
  schema: paginationSchema
};
