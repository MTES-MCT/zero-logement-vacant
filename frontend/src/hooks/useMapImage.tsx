import { useMap } from 'react-map-gl/maplibre';
import { useEffect } from 'react';

interface UseMapImageOptions {
  id: string;
  path: string;
}

export function useMapImage(options: UseMapImageOptions) {
  const { current: map } = useMap();

  useEffect(() => {
    if (map && !map.hasImage(options.id)) {
      map
        .loadImage(options.path)
        .then((response: any) => {
          map.addImage(options.id, response.data, {
            sdf: false
          });
        })
        .catch(console.error);
    }
  }, [map, options.id, options.path]);
}
