import { HOUSING_BY_BUILDING_VALUES } from '@zerologementvacant/models';
import type { HousingByBuilding } from '@zerologementvacant/models';

import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

import { HOUSING_COUNT_OPTIONS } from '../../models/HousingFilters';

export type HousingCountSelectProps<Multiple extends boolean> = Pick<
  SelectProps<HousingByBuilding, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function HousingCountSelect<Multiple extends boolean = false>(
  props: HousingCountSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      label="Nombre de logements"
      options={HOUSING_BY_BUILDING_VALUES}
      getOptionLabel={(option) => HOUSING_COUNT_OPTIONS[option].label}
    />
  );
}

export default HousingCountSelect;
