import { Predicate, Record } from 'effect';

export function keys<A extends Record<string, unknown>>(a: A): Array<keyof A> {
  return Object.keys(a);
}

export function compactNullable<A extends Record<string, unknown>>(
  a: A
): { [K in keyof A]: Exclude<A[K], null | undefined> } {
  return Record.filter(a, Predicate.isNotNullable) as {
    [K in keyof A]: Exclude<A[K], null | undefined>;
  };
}

export function compactUndefined<A extends Record<string, unknown>>(
  a: A
): { [K in keyof A]: Exclude<A[K], undefined> } {
  return Record.filter(a, Predicate.isNotUndefined) as {
    [K in keyof A]: Exclude<A[K], undefined>;
  };
}
