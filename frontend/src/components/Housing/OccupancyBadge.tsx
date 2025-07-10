import Tag from '@codegouvfr/react-dsfr/Tag';
import { Occupancy, OCCUPANCY_LABELS } from '@zerologementvacant/models';

export interface OccupancyBadgeProps {
  occupancy: Occupancy;
}

function OccupancyBadge(props: OccupancyBadgeProps) {
  return <Tag>{OCCUPANCY_LABELS[props.occupancy]}</Tag>;
}

export default OccupancyBadge;
