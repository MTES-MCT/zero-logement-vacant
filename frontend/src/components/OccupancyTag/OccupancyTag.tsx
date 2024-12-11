import Tag, { TagProps } from '@codegouvfr/react-dsfr/Tag';

import { Occupancy } from '@zerologementvacant/models';
import { OCCUPANCY_LABELS } from '../../models/Housing';

interface OccupancyTagProps {
  occupancy: Occupancy;
  tagProps?: Omit<TagProps, 'children'>;
}

function OccupancyTag(props: OccupancyTagProps) {
  const label = OCCUPANCY_LABELS[props.occupancy];
  return <Tag {...props.tagProps}>{label}</Tag>;
}

export default OccupancyTag;
