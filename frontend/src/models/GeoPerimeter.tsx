import type { GeoPerimeterDTO } from '@zerologementvacant/models';

export type GeoPerimeter = GeoPerimeterDTO;

export type GeoPerimeterProperties = Omit<GeoPerimeter, 'geometry'>;

export const geoPerimeterOptions = (geoPerimeters?: GeoPerimeter[]) =>
  geoPerimeters
    ? geoPerimeters
        .filter((_) => _.kind?.length)
        .map((geoPerimeter) => geoPerimeter.kind)
        .filter((value, index, self) => self.indexOf(value) === index)
        .map((_) => ({ value: _, label: _ }))
    : [];
