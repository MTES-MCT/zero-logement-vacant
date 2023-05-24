import _ from 'lodash';

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
  _.isEqual(
    (a1 ?? []).filter((_) => _ !== undefined && _ !== null),
    (a2 ?? []).filter((_) => _ !== undefined && _ !== null)
  );
