export interface PaginatedResult<T> {
    totalCount: number;
    entities: Array<T>;
    page: number;
    perPage: number;
    loading: boolean;
}
