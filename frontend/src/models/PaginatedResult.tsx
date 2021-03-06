import config from '../utils/config';

export interface PaginatedResult<T> {
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
    loading: true
});
