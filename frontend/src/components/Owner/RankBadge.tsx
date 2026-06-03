import { type BadgeProps } from '@codegouvfr/react-dsfr/Badge';
import {
  isAwaitingOwnerRank,
  isDeceasedOwnerRank,
  isDoNotContactOwnerRank,
  isIncorrectOwnerRank,
  isPrimaryOwner,
  isPreviousOwnerRank,
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
    .when(isDoNotContactOwnerRank, () => 'Ne pas contacter')
    .when(isDeceasedOwnerRank, () => 'Propriétaire décédé')
    .when(isIncorrectOwnerRank, () => 'Propriétaire incorrect')
    .when(isAwaitingOwnerRank, () => 'Propriétaire en attente')
    .when(isPreviousOwnerRank, () => 'Ancien propriétaire')
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
    .when(isDeceasedOwnerRank, () => 'beige-gris-galet' as ColorFamily)
    .when(isIncorrectOwnerRank, () => 'beige-gris-galet' as ColorFamily)
    .when(isAwaitingOwnerRank, () => 'beige-gris-galet' as ColorFamily)
    .when(isPreviousOwnerRank, () => 'beige-gris-galet' as ColorFamily)
    .otherwise(() => undefined);

  if (!value) {
    return null;
  }

  // The do-not-contact badge uses the DSFR "error" severity to render in red
  // (with its warning icon), matching the design. Other ranks keep their
  // illustrative colour family and no icon.
  const isDoNotContact = isDoNotContactOwnerRank(props.value);

  return (
    <AppBadge
      small
      noIcon={!isDoNotContact}
      severity={isDoNotContact ? 'error' : undefined}
      colorFamily={isDoNotContact ? undefined : colorFamily}
      {...props.badgeProps}
    >
      {value}
    </AppBadge>
  );
}

export default RankBadge;
