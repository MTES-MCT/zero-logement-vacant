import { Tag, type TagProps } from '@codegouvfr/react-dsfr/Tag';
import type { RelativeLocation } from '@zerologementvacant/models';
import type { MarkOptional } from 'ts-essentials';
import { RELATIVE_LOCATION_LABELS } from '~/models/HousingOwner';

export interface RelativeLocationTagProps {
  value: RelativeLocation;
  tagProps?: MarkOptional<TagProps, 'children'>;
}

function RelativeLocationTag(props: RelativeLocationTagProps) {
  const value = RELATIVE_LOCATION_LABELS[props.value];

  return <Tag {...props.tagProps}>{value}</Tag>;
}

export default RelativeLocationTag;
