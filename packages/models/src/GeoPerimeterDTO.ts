import type { MultiPolygon } from 'geojson';

export interface GeoPerimeterDTO {
  id: string;
  name: string;
  kind: string;
  geometry: MultiPolygon;
}
