import Tag, { type TagProps } from '@codegouvfr/react-dsfr/Tag';
import { Occupancy, OCCUPANCY_LABELS } from '@zerologementvacant/models';
import type { MarkOptional } from 'ts-essentials';

export interface OccupancyBadgeProps {
  occupancy: Occupancy;
  tagProps?: MarkOptional<TagProps, 'children'>;
}

function OccupancyBadge(props: OccupancyBadgeProps) {
  return <Tag {...props.tagProps}>{OCCUPANCY_LABELS[props.occupancy]}</Tag>;
}

export default OccupancyBadge;
