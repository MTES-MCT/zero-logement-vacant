import { Pagination } from '@zerologementvacant/models';
import schemas, { MAX_PER_PAGE } from '@zerologementvacant/schemas';
import { Knex } from 'knex';

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

// Repositories default to this when no pagination is provided, so unpaginated
// find() calls are still capped at 50 rows (matches the legacy paginate()
// default below).
export const DEFAULT_PAGINATION: PaginationEnabled = {
  paginate: true,
  page: 1,
  perPage: 50
};

export function toLimitOffset(pagination: PaginationEnabled): {
  limit: number;
  offset: number;
} {
  return {
    limit: pagination.perPage,
    offset: (pagination.page - 1) * pagination.perPage
  };
}

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
  schema: paginationSchema
};
