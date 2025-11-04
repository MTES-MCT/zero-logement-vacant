import type { MapRef } from 'react-map-gl/maplibre';

export const BUILDING_DARK = 'building-dark';

export async function loadIcon(map: MapRef, path: string, id: string) {
  const response = await map.loadImage(path);
  map.addImage(id, response.data, {
    sdf: false
  });
}
