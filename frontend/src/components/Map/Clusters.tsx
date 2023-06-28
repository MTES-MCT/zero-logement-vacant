import * as turf from '@turf/turf';
import { useEffect } from 'react';
import { Layer, MapRef, Source } from 'react-map-gl';

import { deserialize } from '../../utils/jsonUtils';

interface Props<T> {
  id: string;
  map?: MapRef;
  maxZoom?: number;
  onClick?: (value: T) => void;
  points: turf.Feature<turf.Point, T>[];
  /**
   * The radius (in px) depending on the number of points in the cluster.
   * @example
   * {
   *   0: 20,
   *   5: 30
   * }
   */
  radius?: Record<number, number>;
}

function Clusters<T extends turf.Properties>(props: Props<T>) {
  const maxZoom = props.maxZoom ?? 16;
  // Flatten and remove the zero
  const radius = !props.radius
    ? [24, 5, 36]
    : Object.entries(props.radius).flat().splice(1).map(Number);

  const clusters = turf.featureCollection(props.points);

  useEffect(() => {
    const { map } = props;
    if (map) {
      map.on('click', 'unclustered-points', (e) => {
        const properties = e.features?.[0]?.properties;
        if (properties) {
          props.onClick?.(deserialize(properties) as T);
        }
      });

      map.on('mouseenter', 'unclustered-points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'clusters', function () {
        map.getCanvas().style.cursor = '';
      });
    }
  }, [props, props.map]);

  return (
    <Source
      id={props.id}
      type="geojson"
      cluster
      clusterRadius={100}
      clusterMaxZoom={maxZoom}
      data={clusters}
    >
      <Layer
        id="clusters"
        type="circle"
        interactive
        paint={{
          'circle-color': 'rgba(227, 227, 253, 0.8)',
          'circle-stroke-color': '#000091',
          'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], ...radius],
        }}
      />
      <Layer
        id="cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-size': 16,
        }}
        paint={{
          'text-color': '#000091',
        }}
      />
      <Layer
        id="unclustered-points"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-color': '#000091',
          'circle-radius': 16,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        }}
      />
      <Layer
        id="buildings"
        type="symbol"
        filter={['!', ['has', 'point_count']]}
        layout={{
          'icon-image': [
            'case',
            ['>=', ['get', 'housingCount'], 2],
            'building',
            '',
          ],
          'icon-size': 0.75,
          'text-field': [
            'case',
            ['==', ['get', 'housingCount'], 1],
            ['get', 'order', ['at', 0, ['get', 'housingList']]],
            '',
          ],
          'text-size': 12,
        }}
        paint={{
          'text-color': '#fff',
        }}
      />
    </Source>
  );
}

export default Clusters;
