import {
  DATA_FILE_YEAR_EXCLUDED_OPTIONS,
  DATA_FILE_YEAR_INCLUDED_OPTIONS,
  EMPTY_OPTION
} from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { DataFileYear } from '@zerologementvacant/models';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type DataFileYearSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<DataFileYear | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
> & {
  type: 'included' | 'excluded';
};

function DataFileYearSelect<Multiple extends boolean = false>(
  props: DataFileYearSelectProps<Multiple>
) {
  // Custom sort order for options
  const options: ReadonlyArray<DataFileYear | null> = [
    'lovac-2025',
    'ff-2024',
    'ff-2024-locatif',
    'ff-2023',
    'ff-2023-locatif',
    'lovac-2024',
    'lovac-2023',
    'lovac-2022',
    'lovac-2021',
    'lovac-2020',
    'lovac-2019',
    EMPTY_OPTION.value
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
