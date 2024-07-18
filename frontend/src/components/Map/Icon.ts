import { MapRef } from 'react-map-gl';

export const BUILDING_DARK = 'building-dark';

export function loadIcon(map: MapRef, path: string, id: string) {
  map.loadImage(path, (error, image) => {
    if (error) throw error;
    if (image) {
      map.addImage(id, image, { sdf: true, });
    }
  });
}
