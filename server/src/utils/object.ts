import { pipe, Predicate, Record } from 'effect';

export function keys<A extends Record<string, unknown>>(a: A): Array<keyof A> {
  return Object.keys(a);
}

export function compact<A extends Record<string, unknown>>(a: A) {
  return pipe(
    a,
    Record.filter((value) => Predicate.isNotNullable(value))
  );
}

export function compactUndefined<A extends Record<string, unknown>>(a: A) {
  return pipe(
    a,
    Record.filter((value) => Predicate.isNotUndefined(value))
  );
}
