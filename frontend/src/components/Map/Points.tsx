import * as turf from '@turf/turf';
import { Layer, MapRef, Source } from 'react-map-gl';
import { useEffect } from 'react';
import { deserialize } from '../../utils/jsonUtils';
import { BUILDING_DARK } from './Icon';
import { useMapLayerClick } from '../../hooks/useMapLayerClick';

interface Props<T> {
  id: string;
  map?: MapRef;
  onClick?: (value: T) => void;
  points: turf.Feature<turf.Point, T>[];
}

function Points<T extends turf.Properties>(props: Props<T>) {
  const points = turf.featureCollection(props.points);

  useMapLayerClick({
    layers: ['unclustered-points', 'buildings'],
    map: props.map,
    onClick: props.onClick,
  });

  return (
    <Source id={props.id} type="geojson" data={points}>
      <Layer
        id="unclustered-points"
        type="circle"
        filter={['==', ['get', 'housingCount'], 1]}
        paint={{
          'circle-color': '#000091',
          'circle-radius': 8,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
        }}
      />
      <Layer
        id="buildings"
        type="symbol"
        filter={['>=', ['get', 'housingCount'], 2]}
        layout={{
          'icon-allow-overlap': true,
          'icon-image': BUILDING_DARK,
          'icon-size': 0.75,
        }}
        paint={{
          'icon-color': '#000091',
          'icon-halo-color': '#fff',
          'icon-halo-width': 4,
          'icon-halo-blur': 0,
        }}
      />
    </Source>
  );
}

export default Points;
