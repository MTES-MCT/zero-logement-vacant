import type { RelativeLocationFilter } from '@zerologementvacant/models';
import { RELATIVE_LOCATION_FILTER_VALUES } from '@zerologementvacant/models';

import { RELATIVE_LOCATION_OPTIONS } from '~/models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type RelativeLocationSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<RelativeLocationFilter, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

// Reorder the values as we wish to display them
const values: RelativeLocationFilter[] = [
  'other',
  ...RELATIVE_LOCATION_FILTER_VALUES.filter((value) => value !== 'other')
];

function getOptionLabel(option: RelativeLocationFilter) {
  return RELATIVE_LOCATION_OPTIONS[option].label;
}

function RelativeLocationSelect<Multiple extends boolean = false>(
  props: RelativeLocationSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={values}
      label="Localisation du contact principal"
      getOptionLabel={getOptionLabel}
    />
  );
}

export default RelativeLocationSelect;
