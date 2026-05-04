import { CADASTRAL_CLASSIFICATION_VALUES } from '@zerologementvacant/models';
import {
  CADASTRAL_CLASSIFICATION_EMPTY_OPTION,
  CADASTRAL_CLASSIFICATION_OPTIONS
} from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { CadastralClassification } from '@zerologementvacant/models';
import type { SelectProps } from '~/components/ui/Select/Select';

export type CadastralClassificationSelectProps<Multiple extends boolean> = Pick<
  SelectProps<CadastralClassification | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function CadastralClassificationSelect<Multiple extends boolean = false>(
  props: CadastralClassificationSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={[
        CADASTRAL_CLASSIFICATION_EMPTY_OPTION.value,
        ...CADASTRAL_CLASSIFICATION_VALUES
      ]}
      label="Classement cadastral"
      getOptionLabel={(option) =>
        option === CADASTRAL_CLASSIFICATION_EMPTY_OPTION.value
          ? CADASTRAL_CLASSIFICATION_EMPTY_OPTION.label
          : CADASTRAL_CLASSIFICATION_OPTIONS[option].label
      }
    />
  );
}

export default CadastralClassificationSelect;
