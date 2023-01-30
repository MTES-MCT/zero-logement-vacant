export interface PaginatedResultApi<T> {
  totalCount: number;
  filteredCount: number;
  entities: Array<T>;
  page: number;
  perPage: number;
}
