import { GeoJSON } from 'geojson';

export interface GeoPerimeterApi {
    id: string;
    establishmentId: string;
    name: string;
    type: string;
    geoJson?: GeoJSON;
}
