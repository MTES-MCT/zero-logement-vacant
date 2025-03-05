import { OWNER_KIND_VALUES, OwnerKind } from '@zerologementvacant/models';
import { OWNER_KIND_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type OwnerKindSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<OwnerKind, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function OwnerKindSelect<Multiple extends boolean = false>(
  props: OwnerKindSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={OWNER_KIND_VALUES}
      label="Type de propriétaire"
      getOptionLabel={(option) => OWNER_KIND_OPTIONS[option].label}
    />
  );
}

export default OwnerKindSelect;
