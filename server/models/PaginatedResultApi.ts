export interface PaginatedResultApi<T> {
  totalCount: number;
  entities: Array<T>;
  page: number;
  perPage: number;
}
