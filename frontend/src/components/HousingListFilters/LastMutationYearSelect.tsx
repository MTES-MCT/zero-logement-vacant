import { LAST_MUTATION_YEAR_FILTER_VALUES } from '@zerologementvacant/models';
import type { LastMutationYearFilter } from '@zerologementvacant/models';

import {
  LAST_MUTATION_YEAR_EMPTY_OPTION,
  LAST_MUTATION_YEAR_LABELS
} from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type LastMutationYearSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<LastMutationYearFilter | null, Multiple>,
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
    <AppSelectNext
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
