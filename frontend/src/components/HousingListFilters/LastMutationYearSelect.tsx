import { LAST_MUTATION_YEAR_FILTER_VALUES } from '@zerologementvacant/models';
import type { LastMutationYearFilter } from '@zerologementvacant/models';

import {
  LAST_MUTATION_YEAR_EMPTY_OPTION,
  LAST_MUTATION_YEAR_LABELS
} from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type LastMutationYearSelectProps<Multiple extends boolean> = Pick<
  SelectProps<LastMutationYearFilter | null, Multiple>,
  'className' | 'disabled' | 'multiple' | 'value' | 'onChange'
> & {
  label?: string;
};

function LastMutationYearSelect<Multiple extends boolean = false>(
  props: LastMutationYearSelectProps<Multiple>
) {
  const { label = 'Dernière mutation (date)', ...rest } = props;
  const options = [
    ...LAST_MUTATION_YEAR_FILTER_VALUES,
    LAST_MUTATION_YEAR_EMPTY_OPTION.value
  ];

  return (
    <Select
      {...rest}
      getOptionLabel={(option) =>
        option === LAST_MUTATION_YEAR_EMPTY_OPTION.value
          ? LAST_MUTATION_YEAR_EMPTY_OPTION.label
          : LAST_MUTATION_YEAR_LABELS[option]
      }
      label={label}
      options={options}
    />
  );
}

export default LastMutationYearSelect;
