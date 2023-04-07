import { body, query, ValidationChain } from 'express-validator';
import { Knex } from 'knex';

import { Pagination } from '../../shared/models/Pagination';

export const MAX_PER_PAGE = 500;

export const bodyValidators: ValidationChain[] = [
  body('paginate').default(true).isBoolean(),
  body('page').default(1).isInt({ min: 1 }).toInt(10),
  body('perPage').default(25).isInt({ min: 1, max: MAX_PER_PAGE }).toInt(10),
];

export const queryValidators: ValidationChain[] = [
  query('paginate').default(true).isBoolean(),
  query('page').default(1).isInt({ min: 1 }).toInt(10),
  query('perPage').default(25).isInt({ min: 1, max: MAX_PER_PAGE }).toInt(10),
];

/**
 * Create pagination from a parsed query object.
 * Validate input before using this function!
 * @param query
 */
export function createPagination(
  query: Record<string, unknown>
): Required<Pagination> {
  return {
    paginate: query.paginate as boolean,
    page: query.page as number,
    perPage: query.perPage as number,
  };
}

export function paginationQuery(pagination: Required<Pagination>) {
  return (builder: Knex.QueryBuilder): void => {
    if (pagination.paginate) {
      const { page, perPage } = pagination;
      builder.offset((page - 1) * perPage).limit(perPage);
    }
  };
}

export default {
  create: createPagination,
  query: paginationQuery,
  bodyValidators,
  queryValidators,
};
