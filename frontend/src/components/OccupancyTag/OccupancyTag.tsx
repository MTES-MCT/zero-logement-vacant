import Tag, { TagProps } from '@codegouvfr/react-dsfr/Tag';
import { MarkOptional } from 'ts-essentials';

import { Occupancy } from '@zerologementvacant/models';
import { OCCUPANCY_LABELS } from '../../models/Housing';

interface OccupancyTagProps {
  occupancy: Occupancy;
  tagProps: MarkOptional<TagProps, 'children'>;
}

function OccupancyTag(props: OccupancyTagProps) {
  const label = OCCUPANCY_LABELS[props.occupancy];
  return <Tag {...props.tagProps}>{label}</Tag>;
}

export default OccupancyTag;
