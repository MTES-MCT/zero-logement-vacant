import config from '../utils/config';
import { Paginated } from '../../../shared/models/Pagination';

export interface PaginatedResult<T> extends Paginated<T> {
  loading: boolean;
}

export const initialPaginatedResult = (): PaginatedResult<never> => ({
  entities: [],
  page: 1,
  perPage: config.perPageDefault,
  totalCount: 0,
  filteredCount: 0,
  loading: true,
});
