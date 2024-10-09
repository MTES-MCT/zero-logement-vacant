import type { MultiPolygon } from 'geojson';

import { GeoPerimeterDTO } from '@zerologementvacant/models';

export interface GeoPerimeterApi {
  id: string;
  establishmentId: string;
  name: string;
  kind: string;
  geometry: MultiPolygon;
  createdAt: string;
  createdBy: string;
}

export function toGeoPerimeterDTO(perimeter: GeoPerimeterApi): GeoPerimeterDTO {
  return {
    id: perimeter.id,
    name: perimeter.name,
    kind: perimeter.kind,
    geometry: perimeter.geometry
  };
}
