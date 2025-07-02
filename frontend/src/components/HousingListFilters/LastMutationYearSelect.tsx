import {
  LAST_MUTATION_YEAR_FILTER_VALUES,
  LastMutationYearFilter
} from '@zerologementvacant/models';

import { LAST_MUTATION_YEAR_LABELS } from '../../models/Housing';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type LastMutationYearSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<LastMutationYearFilter, Multiple>,
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
      getOptionLabel={(yearFilter) => LAST_MUTATION_YEAR_LABELS[yearFilter]}
      label={label}
      options={LAST_MUTATION_YEAR_FILTER_VALUES}
    />
  );
}

export default LastMutationYearSelect;
