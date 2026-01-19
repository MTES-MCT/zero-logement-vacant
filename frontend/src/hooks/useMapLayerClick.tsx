import type { GeoJsonProperties } from 'geojson';
import { useEffect } from 'react';
import { type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre';

import { deserialize } from '../utils/jsonUtils';

interface Props<T> {
  layers: string[];
  map: MapRef | undefined;
  onClick?: (value: T, event: MapLayerMouseEvent) => void;
  onMouseEnter?: (value: T, event: MapLayerMouseEvent) => void;
  onMouseLeave?: (value: T, event: MapLayerMouseEvent) => void;
}

export function useMapLayerClick<T extends GeoJsonProperties>(props: Props<T>) {
  const { layers, map, onClick, onMouseEnter, onMouseLeave } = props;
  useEffect(() => {
    if (!map) return;

    const clickHandlers: Array<{
      layer: string;
      handler: (event: MapLayerMouseEvent) => void;
    }> = [];
    const mouseEnterHandlers: Array<{
      layer: string;
      handler: (event: MapLayerMouseEvent) => void;
    }> = [];
    const mouseLeaveHandlers: Array<{
      layer: string;
      handler: (event: MapLayerMouseEvent) => void;
    }> = [];

    layers.forEach((layer) => {
      const clickHandler = (event: MapLayerMouseEvent) => {
        const properties = event.features?.[0]?.properties;
        if (properties) {
          onClick?.(deserialize(properties) as T, event);
        }
      };

      const mouseEnterHandler = (event: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        const properties = event.features?.[0]?.properties;
        if (properties) {
          onMouseEnter?.(deserialize(properties) as T, event);
        }
      };

      const mouseLeaveHandler = (event: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = '';
        const properties = event.features?.[0]?.properties;
        if (properties) {
          onMouseLeave?.(deserialize(properties) as T, event);
        }
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
