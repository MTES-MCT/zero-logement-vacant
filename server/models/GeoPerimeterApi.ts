import * as turf from '@turf/turf';

export interface GeoPerimeterApi {
  id: string;
  establishmentId: string;
  name: string;
  kind: string;
  geoJson?: turf.MultiPolygon;
}
