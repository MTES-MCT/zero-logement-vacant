import { Tag, type TagProps } from '@codegouvfr/react-dsfr/Tag';
import type { RelativeLocation } from '@zerologementvacant/models';
import type { MarkOptional } from 'ts-essentials';
import { match } from 'ts-pattern';

export interface RelativeLocationTagProps {
  value: RelativeLocation;
  commune: string | null;
  department: string | null;
  region: string | null;
  tagProps?: MarkOptional<TagProps, 'children'>;
}

function RelativeLocationTag(props: RelativeLocationTagProps) {
  const value = match(props.value)
    .returnType<string>()
    .with('same-address', () => 'Habite à cette adresse')
    .with('same-commune', () =>
      props.commune
        ? `Habite la commune de ${props.commune}`
        : 'Habite la commune'
    )
    .with('same-department', () =>
      props.department
        ? `Habite dans le département ${props.department}`
        : 'Habite dans le département'
    )
    .with('same-region', () =>
      props.region
        ? `Habite dans la région ${props.region}`
        : 'Habite dans la région'
    )
    .with('metropolitan', () => 'Habite en France métropolitaine')
    .with('overseas', () => 'Habite en Outre-mer')
    .with('other', () => "Pas d'information")
    .exhaustive();

  return <Tag {...props.tagProps}>{value}</Tag>;
}

export default RelativeLocationTag;
