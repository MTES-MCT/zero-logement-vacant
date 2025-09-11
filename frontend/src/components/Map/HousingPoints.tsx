import { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Layer } from 'react-map-gl/maplibre';

import statusColors from './status-colors';

interface Props {
  filter?: FilterSpecification;
  selected: string | null;
  source: string;
}

const SELECTED_SIZE = 16;
const DEFAULT_SIZE = 8;

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
        'circle-radius': [
          'case',
          ['==', ['get', 'id'], props.selected ?? ''],
          SELECTED_SIZE,
          DEFAULT_SIZE
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': [
          'match',
          ['get', 'status', ['at', 0, ['get', 'housingList']]],
          // Apply a stroke color to the circle
          // depending on the housing status
          ...statusColors.borderColors.flat(),
          statusColors.defaultBorderColor
        ]
      }}
      source={props.source}
    />
  );
}

export default HousingPoints;
