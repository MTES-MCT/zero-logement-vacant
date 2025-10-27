import * as turf from '@turf/turf';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { Feature, GeoJsonProperties, Point } from 'geojson';
import type { MapRef } from 'react-map-gl/maplibre';

import { useMapLayerClick } from '../../hooks/useMapLayerClick';
import HousingPoints from './HousingPoints';
import BuildingPoints from './BuildingPoints';

type IdentifiableGeoJson = GeoJsonProperties & { id: string };

interface Props<T> {
  id: string;
  map?: MapRef;
  clusterize?: boolean;
  maxZoom?: number;
  selected: T | null;
  onClick?: (value: T) => void;
  points: Feature<Point, T>[];
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

function Clusters<T extends IdentifiableGeoJson>(props: Props<T>) {
  const maxZoom = props.maxZoom ?? 16;
  // Flatten and remove the zero
  const radius = !props.radius
    ? [24, 5, 36]
    : Object.entries(props.radius).flat().splice(1).map(Number);

  const clusters = turf.featureCollection(props.points);

  useMapLayerClick({
    layers: ['unclustered-points', 'buildings'],
    map: props.map,
    onClick: props.onClick
  });

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
        filter={['has', 'point_count']}
        paint={{
          'circle-color': 'rgba(227, 227, 253, 0.8)',
          'circle-stroke-color': '#000091',
          'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], ...radius]
        }}
      />
      <Layer
        id="cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-size': 16
        }}
        paint={{
          'text-color': '#000091'
        }}
      />
      <HousingPoints
        filter={[
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'housingCount'], 1]
        ]}
        selected={props.selected?.id ?? null}
        source={props.id}
      />
      <BuildingPoints
        filter={[
          'all',
          ['!', ['has', 'point_count']],
          ['>=', ['get', 'housingCount'], 2]
        ]}
        selected={props.selected?.id ?? null}
        source={props.id}
      />
    </Source>
  );
}

export default Clusters;
