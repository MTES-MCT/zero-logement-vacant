import { Layer, MapRef, Source } from 'react-map-gl';
import * as turf from '@turf/turf';

import { Geometry } from 'geojson';
import {
  GeoPerimeter,
  GeoPerimeterProperties,
} from '../../models/GeoPerimeter';

import { isNotNull } from '../../../../shared/utils/compare';

interface Props {
  id: string;
  map?: MapRef;
  isVisible?: boolean;
  perimeters: GeoPerimeter[];
  backgroundColor?: string;
  borderColor?: string;
}

function Perimeters(props: Props) {
  const perimeters = turf.featureCollection(
    props.perimeters
      .map((perimeter) =>
        perimeter.geoJson
          ? turf.feature<Geometry, GeoPerimeterProperties>(perimeter.geoJson, {
              id: perimeter.id,
              name: perimeter.name,
              kind: perimeter.kind,
              establishmentId: perimeter.establishmentId,
            })
          : null
      )
      .filter(isNotNull)
  );

  const isVisible = props.isVisible ?? true;

  return (
    <Source id={props.id} type="geojson" data={perimeters}>
      <Layer
        id={`${props.id}-perimeter-polygons`}
        type="fill"
        paint={{
          'fill-color': props.backgroundColor ?? '#f6f6f6',
          'fill-opacity': isVisible ? 0.51 : 0,
        }}
      />
      <Layer
        id={`${props.id}-outline`}
        type="line"
        paint={{
          'line-color': props.borderColor ?? '#000091',
          'line-width': 2,
          'line-opacity': isVisible ? 1 : 0,
        }}
      />
    </Source>
  );
}

export default Perimeters;
