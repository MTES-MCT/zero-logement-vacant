import { Option, pipe, Predicate, Record } from 'effect';

export function keys<A extends Record<string, unknown>>(a: A): Array<keyof A> {
  return Object.keys(a);
}

export function compactNullable<A extends Record<string, unknown | undefined>>(
  a: A
): A {
  return pipe(
    a,
    Record.filterMap((value) =>
      Predicate.isNotNullable(value) ? Option.some(value) : Option.none()
    )
  ) as A;
}

export function compactUndefined<A extends Record<string, unknown | undefined>>(
  a: A
): A {
  return pipe(
    a,
    Record.filterMap((value) =>
      Predicate.isNotUndefined(value) ? Option.some(value) : Option.none()
    )
  ) as A;
}
