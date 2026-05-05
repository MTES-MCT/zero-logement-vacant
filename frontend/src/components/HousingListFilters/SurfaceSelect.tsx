import { LIVING_AREA_VALUES } from '@zerologementvacant/models';
import type { LivingArea } from '@zerologementvacant/models';
import { LIVING_AREA_OPTIONS } from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type SurfaceSelectProps<Multiple extends boolean> = Pick<
  SelectProps<LivingArea, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function SurfaceSelect<Multiple extends boolean = false>(
  props: SurfaceSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={LIVING_AREA_VALUES}
      label="Surface"
      getOptionLabel={(option) => LIVING_AREA_OPTIONS[option].label}
    />
  );
}

export default SurfaceSelect;
