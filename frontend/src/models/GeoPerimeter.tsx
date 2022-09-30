import { GeoJSON } from 'geojson';

export interface GeoPerimeter {
    id: string;
    establishmentId: string;
    name: string;
    type: string;
    geoJson?: GeoJSON;
}

export const geoPerimeterOptions = (geoPerimeters? : GeoPerimeter[]) =>
    geoPerimeters ? geoPerimeters
        .filter(_ => _.type?.length)
        .map(geoPerimeter => geoPerimeter.type + (geoPerimeter.name && geoPerimeter.name !== geoPerimeter.type ? ` - ${geoPerimeter.name}` : ''))
        .map(_ => ({value: _, label: _}))
        .filter((value, index, self) => self.indexOf(value) === index) : []
