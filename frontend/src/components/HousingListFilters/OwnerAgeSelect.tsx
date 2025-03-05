import { OWNER_AGE_VALUES, OwnerAge } from '@zerologementvacant/models';
import { OWNER_AGE_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type OwnerAgeSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<OwnerAge, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function OwnerAgeSelect<Multiple extends boolean = false>(
  props: OwnerAgeSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={OWNER_AGE_VALUES}
      label="Âge"
      getOptionLabel={(option) => OWNER_AGE_OPTIONS[option].label}
    />
  );
}

export default OwnerAgeSelect;
