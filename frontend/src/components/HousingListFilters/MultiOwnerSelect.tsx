import { match } from 'ts-pattern';

import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type MultiOwnerSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<boolean, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function MultiOwnerSelect<Multiple extends boolean = false>(
  props: MultiOwnerSelectProps<Multiple>
) {
  function getLabel(option: boolean): string {
    return match(option)
      .with(true, () => 'Oui')
      .with(false, () => 'Non')
      .exhaustive();
  }

  return (
    <AppSelectNext
      {...props}
      options={[true, false]}
      label="Multi-propriétaire"
      getOptionLabel={getLabel}
    />
  );
}

export default MultiOwnerSelect;
