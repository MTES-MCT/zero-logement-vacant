import { HousingWithCoordinates } from './Housing';
import fp from 'lodash/fp';

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
    housingList,
  };
}

export function groupByBuilding(
  housingList: HousingWithCoordinates[]
): HousingByBuilding {
  const withIndices = housingList.map((h, i) => ({
    ...h,
    order: `#${i + 1}`,
  }));
  return fp.pipe(
    fp.groupBy('rawAddress'),
    fp.mapValues(createBuilding)
  )(withIndices);
}
