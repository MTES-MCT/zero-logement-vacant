import type { HousingKind } from '@zerologementvacant/models';
import { housingKindOptions } from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type HousingKindSelectProps<Multiple extends boolean> = Pick<
  SelectProps<HousingKind, Multiple>,
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
    <Select
      {...props}
      getOptionLabel={(kind) =>
        housingKindOptions.find((option) => option.value === kind)!.label
      }
      label="Type de logement"
    />
  );
}

export default HousingKindSelect;
