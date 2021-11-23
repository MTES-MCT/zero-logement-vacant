export interface PaginatedResultApi<T> {
    totalCount: number;
    entities: Array<T>
}
