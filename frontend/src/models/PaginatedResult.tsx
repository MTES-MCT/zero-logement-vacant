import { Housing } from './Housing';

export interface PaginatedResult<T> {
  /**
   * @deprecated
   */
  filteredCount: number;
  entities: Array<T>;
  page: number;
  perPage: number;
  loading: boolean;
}

export type HousingPaginatedResult = PaginatedResult<Housing>;
