import {
  LAST_MUTATION_YEAR_FILTER_VALUES,
  LastMutationYearFilter
} from '@zerologementvacant/models';

import {
  LAST_MUTATION_YEAR_EMPTY_OPTION,
  LAST_MUTATION_YEAR_LABELS
} from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

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
  return (
    <AppSelectNext
      {...rest}
      getOptionLabel={(option) =>
        option === LAST_MUTATION_YEAR_EMPTY_OPTION.value
          ? LAST_MUTATION_YEAR_EMPTY_OPTION.label
          : LAST_MUTATION_YEAR_LABELS[option]
      }
      label={label}
      options={LAST_MUTATION_YEAR_FILTER_VALUES}
    />
  );
}

export default LastMutationYearSelect;
