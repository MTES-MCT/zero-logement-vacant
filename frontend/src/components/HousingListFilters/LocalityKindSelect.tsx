import { LOCALITY_KIND_VALUES, LocalityKind } from '@zerologementvacant/models';
import {
  LOCALITY_KIND_EMPTY_OPTION,
  LOCALITY_KIND_OPTIONS
} from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type LocalityKindSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<LocalityKind | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function LocalityKindSelect<Multiple extends boolean = false>(
  props: LocalityKindSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      label="Type de commune"
      options={[LOCALITY_KIND_EMPTY_OPTION.value, ...LOCALITY_KIND_VALUES]}
      getOptionLabel={(option) =>
        option === LOCALITY_KIND_EMPTY_OPTION.value
          ? LOCALITY_KIND_EMPTY_OPTION.label
          : LOCALITY_KIND_OPTIONS[option].label
      }
    />
  );
}

export default LocalityKindSelect;
