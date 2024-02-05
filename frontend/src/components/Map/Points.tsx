import * as turf from '@turf/turf';
import { Layer, MapRef, Source } from 'react-map-gl';
import { useEffect } from 'react';
import { deserialize } from '../../utils/jsonUtils';
import { BUILDING_DARK } from './Icon';

interface Props<T> {
  id: string;
  map?: MapRef;
  onClick?: (value: T) => void;
  points: turf.Feature<turf.Point, T>[];
}

function Points<T extends turf.Properties>(props: Props<T>) {
  const points = turf.featureCollection(props.points);

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

      map.on('mouseleave', 'unclustered-points', function () {
        map.getCanvas().style.cursor = '';
      });
    }
  }, [props, props.map]);

  return (
    <Source id={props.id} type="geojson" data={points}>
      <Layer
        id="unclustered-points"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-color': '#000091',
          'circle-radius': ['case', ['>=', ['get', 'housingCount'], 2], 16, 8],
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
            BUILDING_DARK,
            '',
          ],
          'icon-size': 0.75,
        }}
        paint={{
          'text-color': '#fff',
        }}
      />
    </Source>
  );
}

export default Points;
