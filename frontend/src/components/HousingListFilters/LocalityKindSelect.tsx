import { LOCALITY_KIND_VALUES } from '@zerologementvacant/models';
import type { LocalityKind } from '@zerologementvacant/models';
import {
  LOCALITY_KIND_EMPTY_OPTION,
  LOCALITY_KIND_OPTIONS
} from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type LocalityKindSelectProps<Multiple extends boolean> = Pick<
  SelectProps<LocalityKind | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function LocalityKindSelect<Multiple extends boolean = false>(
  props: LocalityKindSelectProps<Multiple>
) {
  return (
    <Select
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
