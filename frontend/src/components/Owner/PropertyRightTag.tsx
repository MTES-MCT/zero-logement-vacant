import Tag from '@codegouvfr/react-dsfr/Tag';
import type { PropertyRight } from '@zerologementvacant/models';
import { match } from 'ts-pattern';

export interface PropertyRightTagProps {
  value: PropertyRight;
}

function PropertyRightTag(props: PropertyRightTagProps) {
  const value = match(props.value)
    .with('proprietaire-entier', () => 'Plein propriétaire')
    .with('nu-proprietaire', () => 'Nu-propriétaire')
    .with('associe-sci-ir', () => 'Associé SCI IR')
    // Capitalize first letter for other values
    .otherwise((value) => `${value[0].toUpperCase()}${value.slice(1)}`);

  return <Tag small>{value}</Tag>;
}

export default PropertyRightTag;
