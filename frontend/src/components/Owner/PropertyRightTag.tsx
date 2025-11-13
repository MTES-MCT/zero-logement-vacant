import Tag, { type TagProps } from '@codegouvfr/react-dsfr/Tag';
import type { PropertyRight } from '@zerologementvacant/models';
import type { MarkOptional } from 'ts-essentials';
import { match } from 'ts-pattern';

export interface PropertyRightTagProps {
  value: PropertyRight;
  tagProps?: MarkOptional<TagProps, 'children' | 'small'>;
}

function PropertyRightTag(props: PropertyRightTagProps) {
  const value = match(props.value)
    .with('proprietaire-entier', () => 'Plein propriétaire')
    .with('nu-proprietaire', () => 'Nu-propriétaire')
    .with('associe-sci-ir', () => 'Associé SCI IR')
    // Capitalize first letter for other values
    .otherwise((value) => `${value[0].toUpperCase()}${value.slice(1)}`);

  return (
    <Tag small {...props.tagProps}>
      {value}
    </Tag>
  );
}

export default PropertyRightTag;
