import { BUILDING_PERIOD_VALUES } from '@zerologementvacant/models';
import { BUILDING_PERIOD_OPTIONS } from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { BuildingPeriod } from '@zerologementvacant/models';
import type { SelectProps } from '~/components/ui/Select/Select';

export type BuildingPeriodSelectProps<Multiple extends boolean> = Pick<
  SelectProps<BuildingPeriod, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function BuildingPeriodSelect<Multiple extends boolean = false>(
  props: BuildingPeriodSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={BUILDING_PERIOD_VALUES}
      label="Date de construction"
      getOptionLabel={(option) => BUILDING_PERIOD_OPTIONS[option].label}
    />
  );
}

export default BuildingPeriodSelect;
