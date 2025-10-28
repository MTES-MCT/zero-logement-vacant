import { OWNER_AGE_VALUES } from '@zerologementvacant/models';
import type { OwnerAge } from '@zerologementvacant/models';
import {
  OWNER_AGE_EMPTY_OPTION,
  OWNER_AGE_OPTIONS
} from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type OwnerAgeSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<OwnerAge | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function OwnerAgeSelect<Multiple extends boolean = false>(
  props: OwnerAgeSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={[OWNER_AGE_EMPTY_OPTION.value, ...OWNER_AGE_VALUES]}
      label="Âge"
      getOptionLabel={(option) =>
        option === OWNER_AGE_EMPTY_OPTION.value
          ? OWNER_AGE_EMPTY_OPTION.label
          : OWNER_AGE_OPTIONS[option].label
      }
    />
  );
}

export default OwnerAgeSelect;
