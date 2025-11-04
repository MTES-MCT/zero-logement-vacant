import { Array, pipe, Record } from 'effect';
import type { HousingWithCoordinates } from './Housing';

type Ordered<T> = { order: string } & T;

export interface Building {
  id: string;
  latitude: number;
  longitude: number;
  rawAddress: string[];
  housingCount: number;
  housingList: Ordered<HousingWithCoordinates>[];
}

export type HousingByBuilding = Record<string, Building>;

function createBuilding(
  housingList: Ordered<HousingWithCoordinates>[]
): Building {
  const [housing] = housingList;
  return {
    id: housing.rawAddress.join(', '),
    latitude: housing.latitude,
    longitude: housing.longitude,
    rawAddress: housing.rawAddress,
    housingCount: housingList.length,
    housingList
  };
}

export function groupByBuilding(
  housingList: HousingWithCoordinates[]
): HousingByBuilding {
  const withIndices = housingList.map((h, i) => ({
    ...h,
    order: `#${i + 1}`
  }));
  return pipe(
    withIndices,
    Array.groupBy((housing) => housing.rawAddress.join(', ')),
    Record.map(createBuilding)
  );
}
