import type { GeoJsonProperties } from 'geojson';
import { useEffect } from 'react';
import { type MapRef } from 'react-map-gl/maplibre';

import { deserialize } from '../utils/jsonUtils';

interface Props<T> {
  layers: string[];
  map: MapRef | undefined;
  onClick?: (value: T) => void;
  onMouseEnter?: (value: T) => void;
  onMouseLeave?: () => void;
}

export function useMapLayerClick<T extends GeoJsonProperties>(props: Props<T>) {
  const { layers, map, onClick, onMouseEnter, onMouseLeave } = props;
  useEffect(() => {
    if (!map) return;

    const clickHandlers: Array<{ layer: string; handler: (e: any) => void }> =
      [];
    const mouseEnterHandlers: Array<{ layer: string; handler: (e: any) => void }> =
      [];
    const mouseLeaveHandlers: Array<{ layer: string; handler: () => void }> =
      [];

    layers.forEach((layer) => {
      const clickHandler = (e: any) => {
        const properties = e.features?.[0]?.properties;
        if (properties) {
          onClick?.(deserialize(properties) as T);
        }
      };

      const mouseEnterHandler = (e: any) => {
        map.getCanvas().style.cursor = 'pointer';
        const properties = e.features?.[0]?.properties;
        if (properties) {
          onMouseEnter?.(deserialize(properties) as T);
        }
      };

      const mouseLeaveHandler = () => {
        map.getCanvas().style.cursor = '';
        onMouseLeave?.();
      };

      map.on('click', layer, clickHandler);
      map.on('mouseenter', layer, mouseEnterHandler);
      map.on('mouseleave', layer, mouseLeaveHandler);

      clickHandlers.push({ layer, handler: clickHandler });
      mouseEnterHandlers.push({ layer, handler: mouseEnterHandler });
      mouseLeaveHandlers.push({ layer, handler: mouseLeaveHandler });
    });

    return () => {
      clickHandlers.forEach(({ layer, handler }) => {
        map.off('click', layer, handler);
      });
      mouseEnterHandlers.forEach(({ layer, handler }) => {
        map.off('mouseenter', layer, handler);
      });
      mouseLeaveHandlers.forEach(({ layer, handler }) => {
        map.off('mouseleave', layer, handler);
      });
    };
  }, [map, layers, onClick, onMouseEnter, onMouseLeave]);
}
