import Tag from '@codegouvfr/react-dsfr/Tag';
import { Occupancy } from '@zerologementvacant/models';

import { OCCUPANCY_LABELS } from '../../models/Housing';

export interface OccupancyBadgeProps {
  occupancy: Occupancy;
}

function OccupancyBadge(props: OccupancyBadgeProps) {
  return <Tag>{OCCUPANCY_LABELS[props.occupancy]}</Tag>;
}

export default OccupancyBadge;
