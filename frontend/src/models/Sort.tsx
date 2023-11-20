import { prepend } from '../utils/stringUtils';

export type Direction = 'asc' | 'desc';
export type Sort<Sortable extends object = object> = Partial<
  Record<keyof Sortable, Direction>
>;

export function toQuery(sort?: Sort): string[] {
  if (!sort) {
    return [];
  }

  const prependMinus = prepend('-');
  return Object.entries(sort).map(([property, direction]) =>
    direction === 'desc' ? prependMinus(property) : property
  );
}

export interface SortOptions<Sortable extends object> {
  sort?: Sort<Sortable>;
}
