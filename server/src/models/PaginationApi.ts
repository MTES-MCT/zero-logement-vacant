import { query, ValidationChain } from 'express-validator';
import { Knex } from 'knex';

import { Pagination } from '@zerologementvacant/shared';
import { boolean, number, object } from 'yup';

export type PaginationApi = PaginationEnabled | PaginationDisabled;

export interface PaginationEnabled {
  paginate: true;
  page: number;
  perPage: number;
}

export interface PaginationDisabled {
  paginate: false;
}

export const isPaginationEnabled = (
  pagination?: PaginationApi
): pagination is PaginationEnabled =>
  pagination !== undefined && pagination.paginate;

export const MAX_PER_PAGE = 500;

export const validators: ValidationChain[] = [
  query('paginate').default(true).isBoolean(),
  query('page').default(1).isInt({ min: 1 }).toInt(10),
  query('perPage').default(50).isInt({ min: 1, max: MAX_PER_PAGE }).toInt(10)
];

export const queryValidators: ValidationChain[] = [
  query('paginate').default(true).isBoolean(),
  query('page').default(1).isInt({ min: 1 }).toInt(10),
  query('perPage').default(50).isInt({ min: 1, max: MAX_PER_PAGE }).toInt(10)
];

export const paginationSchema = object({
  paginate: boolean().default(true),
  page: number().integer().min(1).default(1),
  perPage: number().integer().min(1).max(MAX_PER_PAGE).default(50),
});

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

export function paginationQuery(pagination?: PaginationApi) {
  return (builder: Knex.QueryBuilder): void => {
    if (isPaginationEnabled(pagination)) {
      const { page, perPage } = pagination;
      builder.offset((page - 1) * perPage).limit(perPage);
    }
  };
}

export default {
  create: createPagination,
  query: paginationQuery,
  validators,
  queryValidators,
  schema: paginationSchema
};
