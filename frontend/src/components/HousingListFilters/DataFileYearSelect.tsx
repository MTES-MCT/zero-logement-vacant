import {
  DATA_FILE_YEAR_VALUES,
  DataFileYear
} from '@zerologementvacant/models';

import {
  DATA_FILE_YEAR_EXCLUDED_OPTIONS,
  DATA_FILE_YEAR_INCLUDED_OPTIONS,
  EMPTY_OPTION
} from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type DataFileYearSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<DataFileYear | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
> & {
  type: 'included' | 'excluded';
};

function DataFileYearSelect<Multiple extends boolean = false>(
  props: DataFileYearSelectProps<Multiple>
) {
  const options = [
    EMPTY_OPTION.value,
    ...DATA_FILE_YEAR_VALUES.toSorted((a, b) => b.localeCompare(a))
  ];
  const label =
    props.type === 'included'
      ? 'Sources et millésimes inclus'
      : 'Sources et millésimes exclus';
  const labels =
    props.type === 'included'
      ? DATA_FILE_YEAR_INCLUDED_OPTIONS
      : DATA_FILE_YEAR_EXCLUDED_OPTIONS;

  return (
    <AppSelectNext
      {...props}
      options={options}
      label={label}
      getOptionLabel={(option) =>
        option === EMPTY_OPTION.value
          ? EMPTY_OPTION.label
          : labels[option].label
      }
    />
  );
}

export default DataFileYearSelect;
