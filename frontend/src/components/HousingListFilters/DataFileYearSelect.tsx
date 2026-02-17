import {
  DATA_FILE_YEAR_EXCLUDED_OPTIONS,
  DATA_FILE_YEAR_INCLUDED_OPTIONS
} from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { DataFileYear } from '@zerologementvacant/models';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

type DataFileYearFilterValue = DataFileYear | 'datafoncier-manual' | null;

export type DataFileYearSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<DataFileYearFilterValue, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
> & {
  type: 'included' | 'excluded';
};

const UNKNOWN_SOURCE_LABEL = 'Source inconnue';

const DATA_FILE_YEAR_GROUPS: Record<string, DataFileYearFilterValue[]> = {
  'Sources les plus récentes': ['lovac-2025', 'ff-2024-locatif'],
  'Autres sources': ['datafoncier-manual', null],
  'Sources antérieures': [
    'lovac-2024',
    'lovac-2023',
    'ff-2023-locatif',
    'lovac-2022',
    'lovac-2021',
    'lovac-2020',
    'lovac-2019'
  ]
};

function getGroup(option: DataFileYearFilterValue): string | null {
  for (const [group, options] of Object.entries(DATA_FILE_YEAR_GROUPS)) {
    if (options.includes(option)) {
      return group;
    }
  }
  return null;
}

function DataFileYearSelect<Multiple extends boolean = false>(
  props: DataFileYearSelectProps<Multiple>
) {
  const options: DataFileYearFilterValue[] = Object.values(
    DATA_FILE_YEAR_GROUPS
  ).flat();

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
      groupBy={getGroup}
      groupClickable={false}
      getOptionKey={(option) => String(option)}
      getOptionLabel={(option) => {
        if (option === null) {
          return UNKNOWN_SOURCE_LABEL;
        }
        if (option === 'datafoncier-manual') {
          return 'Logements ajoutés manuellement';
        }
        return labels[option].label;
      }}
    />
  );
}

export default DataFileYearSelect;
