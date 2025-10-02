import { type BadgeProps } from '@codegouvfr/react-dsfr/Badge';
import {
  isPrimaryOwner,
  isSecondaryOwner,
  type OwnerRank
} from '@zerologementvacant/models';
import { match } from 'ts-pattern';

import AppBadge from '~/components/_app/AppBadge/AppBadge';
import { type ColorFamily } from '~/models/ColorFamily';

export interface RankBadgeProps {
  value: OwnerRank;
  badgeProps?: BadgeProps;
}

function RankBadge(props: RankBadgeProps) {
  const value = match(props.value)
    .when(
      (rank) => isPrimaryOwner({ rank }),
      () => 'Destinataire principal'
    )
    .when(
      (rank) => isSecondaryOwner({ rank }),
      () => 'Destinataire secondaire'
    )
    .otherwise(() => null);

  const colorFamily = match(props.value)
    .returnType<ColorFamily | undefined>()
    .when(
      (rank) => isPrimaryOwner({ rank }),
      () => 'purple-glycine'
    )
    .when(
      (rank) => isSecondaryOwner({ rank }),
      () => 'beige-gris-galet'
    )
    .otherwise(() => undefined);

  if (!value) {
    return null;
  }

  return (
    <AppBadge noIcon small colorFamily={colorFamily} {...props.badgeProps}>
      {value}
    </AppBadge>
  );
}

export default RankBadge;
