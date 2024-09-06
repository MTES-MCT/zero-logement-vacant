import fp from 'lodash/fp';

export function keys<A extends Record<string, unknown>>(a: A): Array<keyof A> {
  return Object.keys(a);
}

export function compact<A extends Record<string, unknown>>(a: A): A {
  return fp.pipe(fp.pickBy((value) => !fp.isNil(value)))(a);
}

export function compactUndefined<A extends Record<string, unknown | undefined>>(
  a: A
): A {
  return fp.pipe(fp.pickBy((value) => !fp.isUndefined(value)))(a);
}
