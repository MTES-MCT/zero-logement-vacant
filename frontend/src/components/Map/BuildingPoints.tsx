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
          // Apply a text color depending on the housing status
          ...statusColors.textColors.flat(),
          statusColors.defaultBackgroundColor
        ],
        'icon-halo-color': statusColors.defaultTextColor,
        'icon-halo-width': 4,
        'icon-halo-blur': 0
      }}
      source={props.source}
    />
  );
}

export default BuildingPoints;
