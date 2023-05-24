import { Housing } from './Housing';
import { isArrayEqual } from '../utils/arrayUtils';

export interface HousingDiff {
  old: Partial<Housing>;
  new: Partial<Housing>;
}

export const getHousingDiff = (
  oldHousing: Housing,
  newHousing: Housing
): HousingDiff => ({
  old: {
    status:
      newHousing.status !== oldHousing.status ? oldHousing.status : undefined,
    subStatus:
      newHousing.subStatus !== oldHousing.subStatus
        ? oldHousing.subStatus
        : undefined,
    precisions: !isArrayEqual(newHousing.precisions, oldHousing.precisions)
      ? oldHousing.precisions
      : undefined,
    vacancyReasons: !isArrayEqual(
      newHousing.vacancyReasons,
      oldHousing.vacancyReasons
    )
      ? oldHousing.vacancyReasons
      : undefined,
    occupancy:
      newHousing.occupancy !== oldHousing.occupancy
        ? oldHousing.occupancy
        : undefined,
  },
  new: {
    status:
      newHousing.status !== oldHousing.status ? newHousing.status : undefined,
    subStatus:
      newHousing.subStatus !== oldHousing.subStatus
        ? newHousing.subStatus
        : undefined,
    precisions: !isArrayEqual(newHousing.precisions, oldHousing.precisions)
      ? newHousing.precisions
      : undefined,
    vacancyReasons: !isArrayEqual(
      newHousing.vacancyReasons,
      oldHousing.vacancyReasons
    )
      ? newHousing.vacancyReasons
      : undefined,
    occupancy:
      newHousing.occupancy !== oldHousing.occupancy
        ? newHousing.occupancy
        : undefined,
  },
});

export const hasValues = (partialHousing: Partial<Housing>) =>
  Object.values(partialHousing).filter((_) => _ !== undefined).length > 0;
