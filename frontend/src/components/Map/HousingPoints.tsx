import { Layer } from 'react-map-gl';

import statusColors from './status-colors';

interface Props {
  filter?: any[];
  source: string;
}

function HousingPoints(props: Props) {
  return (
    <Layer
      id="unclustered-points"
      type="circle"
      filter={props.filter}
      paint={{
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
        'circle-stroke-color': [
          'match',
          ['get', 'status', ['at', 0, ['get', 'housingList']]],
          // Apply a stroke color to the circle
          // depending on the housing status
          ...statusColors.textColors.flat(),
          statusColors.defaultTextColor
        ],
      }}
      source={props.source}
    />
  );
}

export default HousingPoints;
