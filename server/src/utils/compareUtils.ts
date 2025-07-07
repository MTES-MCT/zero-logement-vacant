import lodash from 'lodash-es';

export function compare<T>(a: T, b: T, props: Array<keyof T>): Partial<T> {
  return lodash.pipe(
    lodash.pick(props),
    lodash.pickBy(
      (value, key) =>
        !lodash.isEqualWith(
          customizer,
          value ?? undefined,
          b[key as keyof typeof value] ?? undefined
        )
    )
  )(a);
}

export function includeSameMembers<T>(equals: (a: T, b: T) => boolean) {
  return (a: T[], b: T[]): boolean =>
    a.length === b.length && lodash.xorWith(equals, a, b).length === 0;
}

function customizer(a?: any, b?: any) {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toUpperCase() === b.toUpperCase();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return lodash.isEqual(
      a.map((_) => _.toUpperCase()),
      b.map((_) => _.toUpperCase())
    );
  }
  return lodash.isEqual(a, b);
}
