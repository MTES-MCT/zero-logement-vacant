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
