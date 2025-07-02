import {
  LAST_MUTATION_TYPE_FILTER_VALUES,
  LastMutationTypeFilter
} from '@zerologementvacant/models';

import {
  LAST_MUTATION_TYPE_EMPTY_OPTION,
  LAST_MUTATION_TYPE_LABELS
} from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type LastMutationTypeSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<LastMutationTypeFilter | null, Multiple>,
  'className' | 'disabled' | 'multiple' | 'value' | 'onChange'
> & {
  label?: string;
};

function LastMutationTypeSelect<Multiple extends boolean = false>(
  props: LastMutationTypeSelectProps<Multiple>
) {
  const { label = 'Type de dernière mutation', ...rest } = props;
  const options = [
    LAST_MUTATION_TYPE_EMPTY_OPTION.value,
    ...LAST_MUTATION_TYPE_FILTER_VALUES
  ];
  return (
    <AppSelectNext
      {...rest}
      getOptionLabel={(option) =>
        option === LAST_MUTATION_TYPE_EMPTY_OPTION.value
          ? LAST_MUTATION_TYPE_EMPTY_OPTION.label
          : LAST_MUTATION_TYPE_LABELS[option].label
      }
      label={label}
      options={options}
    />
  );
}

export default LastMutationTypeSelect;
