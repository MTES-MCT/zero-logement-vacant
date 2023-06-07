import { Layer, MapRef, Source } from 'react-map-gl';
import * as turf from '@turf/turf';

import { Geometry } from 'geojson';
import {
  GeoPerimeter,
  GeoPerimeterProperties,
} from '../../models/GeoPerimeter';
import { isNotNull } from '../../utils/compareUtils';

interface Props {
  id: string;
  map?: MapRef;
  perimeters: GeoPerimeter[];
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

  if (!props.perimeters.length) {
    return <></>;
  }

  return (
    <Source id={props.id} type="geojson" data={perimeters}>
      <Layer
        id="perimeter-polygons"
        type="fill"
        paint={{
          'fill-color': 'rgba(227, 227, 253, 0.51)',
        }}
      />
      <Layer
        id="outline"
        type="line"
        paint={{
          'line-color': props.borderColor ?? '#6a6af4',
          'line-width': 2,
        }}
      />
    </Source>
  );
}

export default Perimeters;
