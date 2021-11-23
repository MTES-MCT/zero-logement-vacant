export interface PaginatedResult<T> {
    totalCount: number;
    hasNextPage: boolean;
    entities: Array<T>
}
