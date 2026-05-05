import { OWNERSHIP_KIND_VALUES } from '@zerologementvacant/models';
import type { OwnershipKind } from '@zerologementvacant/models';
import { OWNERSHIP_KIND_OPTIONS } from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type OwnershipKindSelectProps<Multiple extends boolean> = Pick<
  SelectProps<OwnershipKind, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function OwnershipKindSelect<Multiple extends boolean = false>(
  props: OwnershipKindSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={OWNERSHIP_KIND_VALUES}
      label="Type de propriété"
      getOptionLabel={(option) => OWNERSHIP_KIND_OPTIONS[option].label}
    />
  );
}

export default OwnershipKindSelect;
