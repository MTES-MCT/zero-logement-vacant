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
    .with('usufruitier', () => 'Usufruitier')
    .with('administrateur', () => 'Administrateur')
    .with('syndic', () => 'Syndic')
    .with('associe-sci-ir', () => 'Associé SCI IR')
    .with('autre', () => 'Autre')
    .exhaustive();

  return (
    <Tag small {...props.tagProps}>
      {value}
    </Tag>
  );
}

export default PropertyRightTag;
