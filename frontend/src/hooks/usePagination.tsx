import { Pagination } from '@zerologementvacant/models';
import config from '../utils/config';

interface PaginationOptions extends Partial<Pagination> {
  pagination: Pagination;
  count?: number;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
}

export function usePagination(opts: PaginationOptions) {
  const count = opts.count ?? 0;
  const page = opts.pagination.page ?? 1;
  const perPage = opts.pagination.perPage ?? config.perPageDefault;
  const pageCount = Math.ceil(count / perPage);

  const rowNumber = (index: number) => (page - 1) * perPage + index + 1;

  const hasPagination = count > perPage;

  const changePerPage = (perPage: number) => {
    opts.setPagination({
      ...opts.pagination,
      page: 1,
      perPage,
    });
  };

  const changePage = (page: number) => {
    opts.setPagination({
      ...opts.pagination,
      page,
    });
  };
  return {
    pageCount,
    rowNumber,
    hasPagination,
    changePerPage,
    changePage,
  };
}
