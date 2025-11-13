import AppBadge from '~/components/_app/AppBadge/AppBadge';
import { isBanEligible } from '~/models/Address';

export interface ImprovableAddressBadgeProps {
  score: number | null;
  ignored: boolean;
}

function ImprovableAddressBadge(props: ImprovableAddressBadgeProps) {
  const isCorrect = isBanEligible({ score: props.score ?? undefined });

  if (!props.score || isCorrect || props.ignored) {
    return null;
  }

  return (
    <AppBadge small severity="info">
      Adresse améliorable
    </AppBadge>
  );
}

export default ImprovableAddressBadge;
