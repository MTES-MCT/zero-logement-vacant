import { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Layer } from 'react-map-gl/maplibre';

import statusColors from './status-colors';

interface Props {
  filter?: FilterSpecification;
  source: string;
}

function HousingPoints(props: Props) {
  return (
    <Layer
      id="unclustered-points"
      type="circle"
      filter={props.filter}
      paint={{
        // @ts-expect-error: match expects 4 starting arguments
        // before spreading the rest, but we know that
        // statusColors.backgroundColors contains 5 pairs
        'circle-color': [
          'match',
          ['get', 'status', ['at', 0, ['get', 'housingList']]],
          // Apply a background color to the circle
          // depending on the housing status
          ...statusColors.backgroundColors.flat(),
          // Default
          statusColors.defaultBackgroundColor
        ],
        'circle-radius': 8,
        'circle-stroke-width': 1,
        // @ts-expect-error: match expects 4 starting arguments
        'circle-stroke-color': [
          'match',
          ['get', 'status', ['at', 0, ['get', 'housingList']]],
          // Apply a stroke color to the circle
          // depending on the housing status
          ...statusColors.textColors.flat(),
          statusColors.defaultTextColor
        ]
      }}
      source={props.source}
    />
  );
}

export default HousingPoints;
