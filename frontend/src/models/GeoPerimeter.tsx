import { Geometry } from '@turf/turf';

export interface GeoPerimeter {
  id: string;
  establishmentId: string;
  name: string;
  kind: string;
  geoJson?: Geometry;
}

export type GeoPerimeterProperties = Omit<GeoPerimeter, 'geoJson'>;

export const geoPerimeterOptions = (geoPerimeters?: GeoPerimeter[]) =>
  geoPerimeters
    ? geoPerimeters
        .filter((_) => _.kind?.length)
        .map((geoPerimeter) => geoPerimeter.kind)
        .filter((value, index, self) => self.indexOf(value) === index)
        .map((_) => ({ value: _, label: _, }))
    : [];
