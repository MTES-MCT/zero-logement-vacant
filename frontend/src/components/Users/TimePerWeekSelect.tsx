import {
  TIME_PER_WEEK_VALUES,
  type TimePerWeek
} from '@zerologementvacant/models';

import AppSelectNext, {
  type AppSelectNextProps
} from '~/components/_app/AppSelect/AppSelectNext';

export type TimePerWeekSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<TimePerWeek | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function TimePerWeekSelect<Multiple extends boolean = false>(
  props: TimePerWeekSelectProps<Multiple>
) {
  const EMPTY_OPTION_LABEL = 'Sélectionner une option';
  const EMPTY_OPTION_VALUE = null;
  const options = [EMPTY_OPTION_VALUE, ...TIME_PER_WEEK_VALUES];

  return (
    <AppSelectNext
      {...props}
      options={options}
      label="Temps par semaine dédié à la vacance"
      getOptionLabel={(option) =>
        option === null ? EMPTY_OPTION_LABEL : option
      }
      displayEmpty
      emptyLabel={EMPTY_OPTION_LABEL}
    />
  );
}

export default TimePerWeekSelect;
