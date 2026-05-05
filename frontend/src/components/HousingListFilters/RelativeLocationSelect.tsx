import type { RelativeLocationFilter } from '@zerologementvacant/models';
import { RELATIVE_LOCATION_FILTER_VALUES } from '@zerologementvacant/models';

import { RELATIVE_LOCATION_OPTIONS } from '~/models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type RelativeLocationSelectProps<Multiple extends boolean> = Pick<
  SelectProps<RelativeLocationFilter, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

// Reorder the values as we wish to display them
const values = RELATIVE_LOCATION_FILTER_VALUES;

function getOptionLabel(option: RelativeLocationFilter) {
  return RELATIVE_LOCATION_OPTIONS[option].label;
}

function RelativeLocationSelect<Multiple extends boolean = false>(
  props: RelativeLocationSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={values}
      label="Lieu de résidence"
      getOptionLabel={getOptionLabel}
    />
  );
}

export default RelativeLocationSelect;
