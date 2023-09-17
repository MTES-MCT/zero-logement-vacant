import { Pagination } from '../../../shared/models/Pagination';

interface PaginationOptions extends Partial<Pagination> {
  count: number;
}

export function usePagination(opts: PaginationOptions) {
  const { count } = opts;
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 50;
  const pageCount = Math.ceil(count / perPage);

  const rowNumber = (index: number) => (page - 1) * perPage + index + 1;

  const hasPagination = count > perPage;

  return {
    pageCount,
    rowNumber,
    hasPagination,
  };
}
