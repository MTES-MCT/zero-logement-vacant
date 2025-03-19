import {
  OWNERSHIP_KIND_VALUES,
  OwnershipKind
} from '@zerologementvacant/models';
import { OWNERSHIP_KIND_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type OwnershipKindSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<OwnershipKind, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function OwnershipKindSelect<Multiple extends boolean = false>(
  props: OwnershipKindSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={OWNERSHIP_KIND_VALUES}
      label="Type de propriété"
      getOptionLabel={(option) => OWNERSHIP_KIND_OPTIONS[option].label}
    />
  );
}

export default OwnershipKindSelect;
