import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import { match } from 'ts-pattern';

export interface SortButtonProps {
  direction: 'asc' | 'desc' | false;
  title: string;
  onCycleSort(): void;
}

function SortButton(props: SortButtonProps) {
  const { direction, title, onCycleSort } = props;

  return (
    <Button
      iconId={match(direction)
        .returnType<FrIconClassName | RiIconClassName>()
        .with('asc', () => 'fr-icon-arrow-up-line')
        .with('desc', () => 'fr-icon-arrow-down-line')
        .otherwise(() => 'fr-icon-arrow-up-down-line')}
      priority="tertiary"
      size="small"
      title={title}
      onClick={onCycleSort}
    />
  );
}

export default SortButton;
