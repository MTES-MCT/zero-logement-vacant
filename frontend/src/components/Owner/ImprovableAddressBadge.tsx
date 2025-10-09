import AppBadge from '~/components/_app/AppBadge/AppBadge';
import { isBanEligible } from '~/models/Address';

export interface ImprovableAddressBadgeProps {
  score: number | null;
}

function ImprovableAddressBadge(props: ImprovableAddressBadgeProps) {
  const isEligible = isBanEligible({ score: props.score ?? undefined });

  if (!isEligible) {
    return null;
  }

  return (
    <AppBadge small severity="info">
      Adresse améliorable
    </AppBadge>
  );
}

export default ImprovableAddressBadge;
