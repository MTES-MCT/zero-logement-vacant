import type { MultiPolygon } from 'geojson';

export interface GeoPerimeterApi {
  id: string;
  establishmentId: string;
  name: string;
  kind: string;
  geometry: MultiPolygon;
}
