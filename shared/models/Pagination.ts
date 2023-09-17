export interface Pagination {
  paginate: boolean;
  page: number;
  perPage: number;
}

export interface PaginationOptions {
  pagination?: Partial<Pagination>;
}
