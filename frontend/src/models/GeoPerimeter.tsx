import { GeoJSON } from 'geojson';

export interface GeoPerimeter {
    id: string;
    establishmentId: string;
    name: string;
    type: string;
    geoJson?: GeoJSON;
}
