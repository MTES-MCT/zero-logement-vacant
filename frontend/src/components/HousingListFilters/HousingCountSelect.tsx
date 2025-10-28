import { HOUSING_BY_BUILDING_VALUES } from '@zerologementvacant/models';
import { HOUSING_COUNT_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { HousingByBuilding } from '@zerologementvacant/models';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type HousingCountSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<HousingByBuilding, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function HousingCountSelect<Multiple extends boolean = false>(
  props: HousingCountSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      label="Nombre de logements"
      options={HOUSING_BY_BUILDING_VALUES}
      getOptionLabel={(option) => HOUSING_COUNT_OPTIONS[option].label}
    />
  );
}

export default HousingCountSelect;
