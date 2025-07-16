import { isEqual, isEqualWith, pick, pickBy } from 'lodash-es';

import { getOccupancy, Housing } from './Housing';
import { Owner } from './Owner';

export interface Diff<T> {
  old: Partial<T>;
  new: Partial<T>;
}

function compare<T>(a: T, b: T, props: Array<keyof T>): Partial<T> {
  return pickBy(
    pick(a, props),
    (value, key) =>
      !isEqualWith(value, b[key as keyof typeof value], customizer)
  ) as Partial<T>;
}

function getDiff<T>(a: T, b: T, props: Array<keyof T>): Diff<T> {
  return {
    old: compare(a, b, props),
    new: compare(b, a, props)
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
    return isEqual(
      a.map((_) => _?.toUpperCase()),
      b.map((_) => _?.toUpperCase())
    );
  }
  return isEqual(a, b);
}

export const getHousingDiff = (
  before: Housing,
  after: Housing
): Diff<Housing> =>
  getDiff(
    {
      ...before,
      occupancy: getOccupancy(before.occupancy),
      occupancyIntended: getOccupancy(before.occupancyIntended)
    },
    {
      ...after,
      occupancy: getOccupancy(after.occupancy),
      occupancyIntended: getOccupancy(after.occupancyIntended)
    },
    ['status', 'subStatus', 'occupancy', 'occupancyIntended']
  );

export const getOwnerDiff = (oldOwner: Owner, newOwner: Owner): Diff<Owner> =>
  getDiff(oldOwner, newOwner, [
    'fullName',
    'birthDate',
    'rawAddress',
    'email',
    'phone',
    'banAddress',
    'additionalAddress'
  ]);
