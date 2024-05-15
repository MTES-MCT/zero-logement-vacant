import { Pagination } from '@zerologementvacant/models';
import config from '../utils/config';

interface PaginationOptions extends Partial<Pagination> {
  count?: number;
}

export function usePagination(opts: PaginationOptions) {
  const count = opts.count ?? 0;
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? config.perPageDefault;
  const pageCount = Math.ceil(count / perPage);

  const rowNumber = (index: number) => (page - 1) * perPage + index + 1;

  const hasPagination = count > perPage;

  return {
    pageCount,
    rowNumber,
    hasPagination,
  };
}
