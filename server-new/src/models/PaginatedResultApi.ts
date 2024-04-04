import { HousingApi } from './HousingApi';

export interface PaginatedResultApi<T> {
  totalCount: number;
  filteredCount: number;
  entities: Array<T>;
  page: number;
  perPage: number;
}

export function isPartial(page: PaginatedResultApi<any>): boolean {
  return page.filteredCount < page.totalCount;
}

export type HousingPaginatedResultApi = PaginatedResultApi<HousingApi> & {
  filteredOwnerCount: number;
};
