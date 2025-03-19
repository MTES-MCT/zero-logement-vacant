import { HousingKind } from '@zerologementvacant/models';
import { housingKindOptions } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type HousingKindSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<HousingKind, Multiple>,
  | 'className'
  | 'disabled'
  | 'error'
  | 'invalid'
  | 'multiple'
  | 'options'
  | 'value'
  | 'onChange'
>;

function HousingKindSelect<Multiple extends boolean = false>(
  props: HousingKindSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      getOptionLabel={(kind) =>
        housingKindOptions.find((option) => option.value === kind)!.label
      }
      label="Type de logement"
    />
  );
}

export default HousingKindSelect;
