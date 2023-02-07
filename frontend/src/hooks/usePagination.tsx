import { useMemo } from 'react';
import { PaginatedResult } from '../models/PaginatedResult';

export function usePagination<T>(paginatedResult: PaginatedResult<T>) {
  const pageCount = useMemo<number>(
    () => Math.ceil(paginatedResult.filteredCount / paginatedResult.perPage),
    [paginatedResult.filteredCount, paginatedResult.perPage]
  );

  const rowNumber = useMemo<(index: number) => number>(
    () => (index: number) =>
      (paginatedResult.page - 1) * paginatedResult.perPage + index + 1,
    [paginatedResult.page, paginatedResult.perPage]
  );

  const hasPagination = useMemo<boolean>(() => {
    return paginatedResult.filteredCount > paginatedResult.perPage;
  }, [paginatedResult.filteredCount, paginatedResult.perPage]);

  return {
    pageCount,
    rowNumber,
    hasPagination,
  };
}
