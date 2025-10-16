import Tag, { type TagProps } from '@codegouvfr/react-dsfr/Tag';
import type { MarkOptional } from 'ts-essentials';

export interface OwnerKindTagProps {
  // String for now. Will be replaced by {@link OwnerKind}
  // when the data model will be updated.
  value: string | null;
  tagProps?: MarkOptional<TagProps, 'children' | 'small'>;
}

function OwnerKindTag(props: OwnerKindTagProps) {
  if (!props.value) {
    return null;
  }

  return (
    <Tag small {...props.tagProps}>
      {props.value}
    </Tag>
  );
}

export default OwnerKindTag;
