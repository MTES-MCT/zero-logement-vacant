import { Tag, type TagProps } from '@codegouvfr/react-dsfr/Tag';
import type { RelativeLocation } from '@zerologementvacant/models';

import { RELATIVE_LOCATION_LABELS } from '~/models/HousingOwner';

type TagSpanProps = Omit<TagProps.Common, 'children'> &
  (TagProps.WithIcon | TagProps.WithoutIcon) &
  Omit<TagProps.AsSpan, 'as'>;

export interface RelativeLocationTagProps {
  value: RelativeLocation;
  tagProps?: TagSpanProps;
}

function RelativeLocationTag(props: RelativeLocationTagProps) {
  const value = RELATIVE_LOCATION_LABELS[props.value];

  return (
    <Tag
      {...props.tagProps}
      as="span"
      nativeSpanProps={{
        ...props.tagProps?.nativeSpanProps,
        'aria-label': 'Localisation du destinataire principal'
      }}
    >
      {value}
    </Tag>
  );
}

export default RelativeLocationTag;
