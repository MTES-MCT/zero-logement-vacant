import * as turf from '@turf/turf';
import { Feature, GeoJsonProperties, Point } from 'geojson';
import { MapRef, Source } from 'react-map-gl/maplibre';

import { useMapLayerClick } from '../../hooks/useMapLayerClick';
import HousingPoints from './HousingPoints';
import BuildingPoints from './BuildingPoints';

interface Props<T> {
  id: string;
  map?: MapRef;
  onClick?: (value: T) => void;
  points: Feature<Point, T>[];
}

function Points<T extends GeoJsonProperties>(props: Props<T>) {
  const points = turf.featureCollection(props.points);

  useMapLayerClick({
    layers: ['unclustered-points', 'buildings'],
    map: props.map,
    onClick: props.onClick
  });

  return (
    <Source id={props.id} type="geojson" data={points}>
      <HousingPoints
        filter={['==', ['get', 'housingCount'], 1]}
        source={props.id}
      />
      <BuildingPoints
        filter={['>=', ['get', 'housingCount'], 2]}
        source={props.id}
      />
    </Source>
  );
}

export default Points;
