import fp from 'lodash/fp';

import { Identifiable } from '../models/Identifiable';

export function ensure<T>(
  argument: T | undefined | null,
  message = 'This value was promised to be there.'
): T {
  if (argument === undefined || argument === null) {
    throw new TypeError(message);
  }

  return argument;
}

export function concat<T>(array: Array<T> | undefined, ...items: Array<T>) {
  return [...(array ?? []), ...items];
}

export const isArrayEqual = (a1?: string[], a2?: string[]) =>
  fp.isEqual(
    (a1 ?? []).filter((_) => _ !== undefined && _ !== null),
    (a2 ?? []).filter((_) => _ !== undefined && _ !== null)
  );

export function includeWith<T, K extends keyof T>(
  included: Array<T[K]>,
  map: (item: T) => T[K]
) {
  return (array: Array<T>): Array<T> => {
    return included.length === 0
      ? array
      : array.filter((item) => included.includes(map(item)));
  };
}

export function include<T extends Identifiable>(ids: string[]) {
  return includeWith<T, 'id'>(ids, (item) => item.id);
}
export function excludeWith<T, K extends keyof T>(
  excluded: Array<T[K]>,
  map: (item: T) => T[K]
) {
  return (array: Array<T>): Array<T> => {
    return excluded.length === 0
      ? array
      : array.filter((item) => !excluded.includes(map(item)));
  };
}

export function exclude<T extends Identifiable>(ids: string[]) {
  return excludeWith<T, 'id'>(ids, (item) => item.id);
}

export function includeExclude(included: string[], excluded: string[]) {
  return fp.pipe(include(included), exclude(excluded));
}

export function includeExcludeWith<T, K extends keyof T>(
  included: Array<T[K]>,
  excluded: Array<T[K]>,
  map: (item: T) => T[K]
) {
  return fp.pipe(includeWith(included, map), excludeWith(excluded, map));
}
