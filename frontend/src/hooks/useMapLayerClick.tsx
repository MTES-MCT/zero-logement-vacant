import * as turf from '@turf/turf';
import { useEffect } from 'react';
import { MapRef } from 'react-map-gl';

import { deserialize } from '../utils/jsonUtils';

interface Props<T> {
  layers: string[];
  map: MapRef | undefined;
  onClick?: (value: T) => void;
}

export function useMapLayerClick<T extends turf.Properties>(props: Props<T>) {
  useEffect(() => {
    const { layers, map, onClick } = props;

    if (map) {
      layers.forEach((layer) => {
        map.on('click', layer, (e) => {
          const properties = e.features?.[0]?.properties;
          if (properties) {
            onClick?.(deserialize(properties) as T);
          }
        });

        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layer, function () {
          map.getCanvas().style.cursor = '';
        });
      });
    }
  }, [props, props.map]);
}
