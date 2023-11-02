import fp from 'lodash/fp';

export function compare<T>(a: T, b: T, props: Array<keyof T>): Partial<T> {
  return fp.pipe(
    fp.pick(props),
    fp.pickBy(
      (value, key) =>
        !fp.isEqualWith(
          customizer,
          value ?? undefined,
          b[key as keyof typeof value] ?? undefined
        )
    )
  )(a);
}

export function includeSameMembers<T>(equals: (a: T, b: T) => boolean) {
  return (a: T[], b: T[]): boolean =>
    a.length === b.length && fp.xorWith(equals, a, b).length === 0;
}

function customizer(a?: any, b?: any) {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toUpperCase() === b.toUpperCase();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return fp.isEqual(
      a.map((_) => _.toUpperCase()),
      b.map((_) => _.toUpperCase())
    );
  }
  return fp.isEqual(a, b);
}
