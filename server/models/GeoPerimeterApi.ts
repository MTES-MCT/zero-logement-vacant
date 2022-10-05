import { GeoJSON } from 'geojson';

export interface GeoPerimeterApi {
    id: string;
    establishmentId: string;
    name: string;
    kind: string;
    geoJson?: GeoJSON;
}
