export interface Pagination {
  paginate?: boolean;
  page?: number;
  perPage?: number;
}

export interface PaginationOptions {
  pagination?: Pagination;
}

export interface Paginated<T> {
  entities: Array<T>;
  filteredCount: number;
  totalCount: number;
  page: number;
  perPage: number;
}

export function isPartial(page: Paginated<any>): boolean {
  return page.filteredCount < page.totalCount;
}
