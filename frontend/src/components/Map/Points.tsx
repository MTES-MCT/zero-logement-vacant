import * as turf from '@turf/turf';
import { Layer, MapRef, Source } from 'react-map-gl';
import { BUILDING_DARK } from './Icon';
import { useMapLayerClick } from '../../hooks/useMapLayerClick';
import HousingPoints from './HousingPoints';
import BuildingPoints from './BuildingPoints';

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
