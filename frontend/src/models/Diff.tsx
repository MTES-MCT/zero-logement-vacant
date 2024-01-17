import fp from 'lodash/fp';

import { Housing } from './Housing';
import { Owner } from './Owner';

export interface Diff<T> {
  old: Partial<T>;
  new: Partial<T>;
}

function compare<T>(a: T, b: T, props: Array<keyof T>): Partial<T> {
  return fp.pipe(
    fp.pick(props),
    fp.pickBy(
      (value, key) =>
        !fp.isEqualWith(customizer, value, b[key as keyof typeof value])
    )
  )(a);
}

function getDiff<T>(a: T, b: T, props: Array<keyof T>): Diff<T> {
  return {
    old: compare(a, b, props),
    new: compare(b, a, props),
  };
}

export function hasValues<T>(partial: Partial<T>) {
  return (
    Object.values(partial).filter(
      (_) => _ !== undefined && _ !== null && (_ as any[]).length !== 0
    ).length > 0
  );
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

export const getHousingDiff = (
  oldHousing: Housing,
  newHousing: Housing
): Diff<Housing> =>
  getDiff(oldHousing, newHousing, [
    'status',
    'subStatus',
    'precisions',
    'vacancyReasons',
    'occupancy',
    'occupancyIntended',
  ]);

export const getOwnerDiff = (oldOwner: Owner, newOwner: Owner): Diff<Owner> =>
  getDiff(oldOwner, newOwner, [
    'fullName',
    'birthDate',
    'rawAddress',
    'email',
    'phone',
    'banAddress',
    'additionalAddress',
  ]);
