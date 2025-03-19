import { LIVING_AREA_VALUES, LivingArea } from '@zerologementvacant/models';
import { LIVING_AREA_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type SurfaceSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<LivingArea, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function SurfaceSelect<Multiple extends boolean = false>(
  props: SurfaceSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={LIVING_AREA_VALUES}
      label="Surface"
      getOptionLabel={(option) => LIVING_AREA_OPTIONS[option].label}
    />
  );
}

export default SurfaceSelect;
