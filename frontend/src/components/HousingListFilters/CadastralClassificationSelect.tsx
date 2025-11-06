import { CADASTRAL_CLASSIFICATION_VALUES } from '@zerologementvacant/models';
import {
  CADASTRAL_CLASSIFICATION_EMPTY_OPTION,
  CADASTRAL_CLASSIFICATION_OPTIONS
} from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { CadastralClassification } from '@zerologementvacant/models';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type CadastralClassificationSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<CadastralClassification | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function CadastralClassificationSelect<Multiple extends boolean = false>(
  props: CadastralClassificationSelectProps<Multiple>
) {
  return (
    <AppSelectNext
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
