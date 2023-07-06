import fp from 'lodash/fp';

import { Housing } from './Housing';

export interface HousingDiff {
  old: Partial<Housing>;
  new: Partial<Housing>;
}

function compare(a: Housing, b: Housing): Partial<Housing> {
  return fp.pipe(
    fp.pick([
      'status',
      'subStatus',
      'precisions',
      'vacancyReasons',
      'occupancy',
      'occupancyIntended',
    ]),
    fp.pickBy((value, key) => !fp.isEqual(value, b[key as keyof typeof value]))
  )(a);
}

export const getHousingDiff = (
  oldHousing: Housing,
  newHousing: Housing
): HousingDiff => {
  return {
    old: compare(oldHousing, newHousing),
    new: compare(newHousing, oldHousing),
  };
};

export const hasValues = (partialHousing: Partial<Housing>) =>
  Object.values(partialHousing).filter(
    (_) => _ !== undefined && _ !== null && (_ as any[]).length !== 0
  ).length > 0;
