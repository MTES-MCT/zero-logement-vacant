import {
  BUILDING_PERIOD_VALUES,
  BuildingPeriod
} from '@zerologementvacant/models';
import { BUILDING_PERIOD_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type BuildingPeriodSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<BuildingPeriod, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function BuildingPeriodSelect<Multiple extends boolean = false>(
  props: BuildingPeriodSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={BUILDING_PERIOD_VALUES}
      label="Date de construction"
      getOptionLabel={(option) => BUILDING_PERIOD_OPTIONS[option].label}
    />
  );
}

export default BuildingPeriodSelect;
