import Tag, { type TagProps } from '@codegouvfr/react-dsfr/Tag';
import type { OwnerRank } from '@zerologementvacant/models';
import { match } from 'ts-pattern';

export interface OwnerStatusBadgeProps {
  rank: OwnerRank;
  tagProps?: TagProps;
}

function OwnerStatusTag(props: OwnerStatusBadgeProps) {
  const label = match(props.rank)
    .returnType<string | null>()
    .with(0, () => 'Ancien propriétaire')
    .with(-1, () => 'Propriétaire incorrect')
    .with(
      -2,
      () => 'Propriétaire doublon LOVAC 2024 - En attente de traitement par ZLV'
    )
    .with(-3, () => 'Propriétaire décédé')
    .otherwise(() => null);

  return (
    <Tag small {...props.tagProps}>
      {label}
    </Tag>
  );
}

export default OwnerStatusTag;
