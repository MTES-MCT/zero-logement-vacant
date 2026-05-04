import { match } from 'ts-pattern';

import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type MultiOwnerSelectProps<Multiple extends boolean> = Pick<
  SelectProps<boolean, Multiple>,
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
    <Select
      {...props}
      options={[true, false]}
      label="Multi-propriétaire"
      getOptionLabel={getLabel}
    />
  );
}

export default MultiOwnerSelect;
