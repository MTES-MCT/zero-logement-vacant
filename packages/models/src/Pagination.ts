export interface Pagination {
  paginate?: boolean;
  page: number;
  perPage: number;
}

export interface PaginationOptions {
  pagination?: Partial<Pagination>;
}

/**
 * @deprecated Use PaginatedResponse instead.
 */
export interface Paginated<T> {
  totalCount: number;
  filteredCount: number;
  page: number;
  perPage: number;
  entities: ReadonlyArray<T>;
}

interface PaginatedOptions {
  acceptRanges: string | null;
  contentRange: string | null;
}

export interface PaginatedResponse<T> {
  entities: ReadonlyArray<T>;
  total: number;
}

export function paginated<T>(
  entities: ReadonlyArray<T>,
  headers: PaginatedOptions
): PaginatedResponse<T> {
  const { acceptRanges, contentRange } = headers;
  if (!acceptRanges || !contentRange) {
    throw new Error(
      'Missing pagination headers Accept-Ranges or Content-Range'
    );
  }

  // Parse Content-Range header: "owners ${rangeStart}-${rangeEnd}/${count}"
  const match = contentRange.match(/(\w+)\s+(\d+)-(\d+)\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid Content-Range header format: ${contentRange}`);
  }

  const [, , , , total] = match;

  return {
    entities,
    total: Number(total)
  };
}