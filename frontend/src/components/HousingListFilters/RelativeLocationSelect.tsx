import type { RelativeLocation } from '@zerologementvacant/models';
import { RELATIVE_LOCATION_VALUES } from '@zerologementvacant/models';

import { RELATIVE_LOCATION_OPTIONS } from '~/models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type RelativeLocationSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<RelativeLocation, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function RelativeLocationSelect<Multiple extends boolean = false>(
  props: RelativeLocationSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={RELATIVE_LOCATION_VALUES}
      label="Localisation du contact principal"
      getOptionLabel={(option) => RELATIVE_LOCATION_OPTIONS[option].label}
    />
  );
}

export default RelativeLocationSelect;
