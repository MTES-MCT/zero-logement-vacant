import config from '../utils/config';
import { Housing } from './Housing';

export interface PaginatedResult<T> {
  /**
   * @deprecated
   */
  filteredCount: number;
  /**
   * @deprecated
   */
  totalCount: number;
  entities: Array<T>;
  page: number;
  perPage: number;
  loading: boolean;
}

export const initialPaginatedResult = () => ({
  entities: [],
  page: 1,
  perPage: config.perPageDefault,
  totalCount: 0,
  filteredCount: 0,
  loading: true,
});

export type HousingPaginatedResult = PaginatedResult<Housing> & {
  /**
   * @deprecated
   */
  filteredOwnerCount: number;
};
