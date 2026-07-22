import { useEffect } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

export interface MapImage {
  id: string;
  path: string;
}

export function useMapImages(
  map: MapRef | undefined,
  images: readonly MapImage[]
) {
  useEffect(() => {
    if (!map) {
      return;
    }

    const mapRef = map;
    let cancelled = false;

    async function registerImage(image: MapImage) {
      if (hasImage(mapRef, image.id) !== false) {
        return;
      }

      try {
        const response = await mapRef.loadImage(image.path);

        if (!cancelled && hasImage(mapRef, image.id) === false) {
          mapRef.addImage(image.id, response.data, {
            sdf: false
          });
        }
      } catch (error) {
        if (!cancelled && hasImage(mapRef, image.id) !== undefined) {
          console.error(error);
        }
      }
    }

    function registerImages() {
      void Promise.all(images.map(registerImage));
    }

    function onStyleLoad() {
      registerImages();
    }

    registerImages();
    mapRef.on('style.load', onStyleLoad);

    return () => {
      cancelled = true;
      mapRef.off('style.load', onStyleLoad);
    };
  }, [map, images]);
}

function hasImage(map: MapRef, id: string): boolean | undefined {
  try {
    return map.hasImage(id);
  } catch {
    return undefined;
  }
}
