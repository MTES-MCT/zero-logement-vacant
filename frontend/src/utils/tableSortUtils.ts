import type { SortingState } from '@tanstack/react-table';
import { Record } from 'effect';

/**
 * Convert TanStack table {@link SortingState} into the API sort record
 * format expected by RTK Query endpoints (`{ [columnId]: 'asc' | 'desc' }`).
 */
export function toSortRecord(sorting: SortingState) {
  return Record.fromEntries(
    sorting.map((s) => [s.id, s.desc ? 'desc' : 'asc'])
  );
}
