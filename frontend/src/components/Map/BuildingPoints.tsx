import { Layer } from 'react-map-gl/maplibre';
import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';

import { HousingStatus } from '../../models/HousingState';

interface Props {
  filter?: FilterSpecification;
  selected: string | null;
  source: string;
}

const SELECTED_SIZE_COEFFICIENT = 2;
const DEFAULT_SIZE_COEFFICIENT = 1;

function BuildingPoints(props: Props) {
  return (
    <Layer
      id="buildings"
      type="symbol"
      filter={props.filter}
      layout={{
        'icon-allow-overlap': true,
        'icon-image': [
          'match',
          ['get', 'status', ['at', 0, ['get', 'housingList']]],
          HousingStatus.Waiting,
          `square-fill-${HousingStatus.Waiting}`,
          HousingStatus.FirstContact,
          `square-fill-${HousingStatus.FirstContact}`,
          HousingStatus.InProgress,
          `square-fill-${HousingStatus.InProgress}`,
          HousingStatus.Completed,
          `square-fill-${HousingStatus.Completed}`,
          HousingStatus.Blocked,
          `square-fill-${HousingStatus.Blocked}`,
          // Default value
          `square-fill-${HousingStatus.NeverContacted}`
        ],
        'icon-size': [
          'case',
          ['==', ['get', 'id'], props.selected ?? ''],
          SELECTED_SIZE_COEFFICIENT,
          DEFAULT_SIZE_COEFFICIENT
        ]
      }}
      source={props.source}
    />
  );
}

export default BuildingPoints;
