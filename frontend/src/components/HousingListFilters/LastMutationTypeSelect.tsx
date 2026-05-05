import { LAST_MUTATION_TYPE_FILTER_VALUES } from '@zerologementvacant/models';
import type { LastMutationTypeFilter } from '@zerologementvacant/models';

import {
  LAST_MUTATION_TYPE_EMPTY_OPTION,
  LAST_MUTATION_TYPE_LABELS
} from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type LastMutationTypeSelectProps<Multiple extends boolean> = Pick<
  SelectProps<LastMutationTypeFilter | null, Multiple>,
  'className' | 'disabled' | 'multiple' | 'value' | 'onChange'
> & {
  label?: string;
};

function LastMutationTypeSelect<Multiple extends boolean = false>(
  props: LastMutationTypeSelectProps<Multiple>
) {
  const { label = 'Dernière mutation (type)', ...rest } = props;
  const options = [
    ...LAST_MUTATION_TYPE_FILTER_VALUES,
    LAST_MUTATION_TYPE_EMPTY_OPTION.value
  ];
  return (
    <Select
      {...rest}
      getOptionLabel={(option) =>
        option === LAST_MUTATION_TYPE_EMPTY_OPTION.value
          ? LAST_MUTATION_TYPE_EMPTY_OPTION.label
          : LAST_MUTATION_TYPE_LABELS[option]
      }
      label={label}
      options={options}
    />
  );
}

export default LastMutationTypeSelect;
