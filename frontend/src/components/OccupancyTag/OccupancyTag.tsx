import Tag, { TagProps } from '@codegouvfr/react-dsfr/Tag';

import { Occupancy, OCCUPANCY_LABELS } from '@zerologementvacant/models';
import { MarkOptional } from 'ts-essentials';

interface OccupancyTagProps {
  occupancy: Occupancy;
  tagProps: MarkOptional<TagProps, 'children'>;
}

function OccupancyTag(props: OccupancyTagProps) {
  const label = OCCUPANCY_LABELS[props.occupancy];
  return <Tag {...props.tagProps}>{label}</Tag>;
}

export default OccupancyTag;
