export interface Pagination {
  paginate?: boolean;
  page: number;
  perPage: number;
}

export interface PaginationOptions {
  pagination?: Partial<Pagination>;
}

/**
 * @deprecated
 */
export interface Paginated<T> {
  totalCount: number;
  filteredCount: number;
  page: number;
  perPage: number;
  entities: ReadonlyArray<T>;
}
