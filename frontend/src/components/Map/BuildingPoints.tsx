import { Layer } from 'react-map-gl/maplibre';

import { BUILDING_DARK } from './Icon';
import statusColors from './status-colors';
import { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';

interface Props {
  filter?: FilterSpecification;
  source: string;
}

function BuildingPoints(props: Props) {
  return (
    <Layer
      id="buildings"
      type="symbol"
      filter={props.filter}
      layout={{
        'icon-allow-overlap': true,
        'icon-image': BUILDING_DARK,
        'icon-size': 0.75
      }}
      paint={{
        // @ts-expect-error: match expects 4 starting arguments
        'icon-color': [
          'match',
          ['get', 'status', ['at', 0, ['get', 'housingList']]],
          // Apply a background color depending on the housing status
          ...statusColors.backgroundColors.flat(),
          statusColors.defaultBackgroundColor
        ],
        // @ts-expect-error: match expects 4 starting arguments
        'icon-halo-color': [
          'match',
          ['get', 'status', ['at', 0, ['get', 'housingList']]],
          // Apply a stroke color to the circle
          // depending on the housing status
          ...statusColors.borderColors.flat(),
          statusColors.defaultBorderColor
        ],
        'icon-halo-width': 4,
        'icon-halo-blur': 0,
        'text-opacity': 0
      }}
      source={props.source}
    />
  );
}

export default BuildingPoints;
