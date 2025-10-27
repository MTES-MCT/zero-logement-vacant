import * as turf from '@turf/turf';
import { Source } from 'react-map-gl/maplibre';
import type { Feature, GeoJsonProperties, Point } from 'geojson';
import type { MapRef } from 'react-map-gl/maplibre';

import { useMapLayerClick } from '../../hooks/useMapLayerClick';
import HousingPoints from './HousingPoints';
import BuildingPoints from './BuildingPoints';


type IdentifiableGeoJson = GeoJsonProperties & { id: string };

interface Props<T extends IdentifiableGeoJson> {
  id: string;
  map?: MapRef;
  points: Feature<Point, T>[];
  selected: T | null;
  onClick?: (value: T) => void;
}

function Points<T extends IdentifiableGeoJson>(props: Props<T>) {
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
        selected={props.selected?.id ?? null}
        source={props.id}
      />
      <BuildingPoints
        filter={['>=', ['get', 'housingCount'], 2]}
        selected={props.selected?.id ?? null}
        source={props.id}
      />
    </Source>
  );
}

export default Points;
