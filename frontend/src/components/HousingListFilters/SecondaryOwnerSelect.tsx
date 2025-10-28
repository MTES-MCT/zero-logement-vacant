import { BENEFIARY_COUNT_VALUES } from '@zerologementvacant/models';
import type { BeneficiaryCount } from '@zerologementvacant/models';
import { BENEFICIARY_COUNT_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type SecondaryOwnerSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<BeneficiaryCount, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function SecondaryOwnerSelect<Multiple extends boolean = false>(
  props: SecondaryOwnerSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={BENEFIARY_COUNT_VALUES}
      label="Propriétaires secondaires"
      getOptionLabel={(option) => BENEFICIARY_COUNT_OPTIONS[option].label}
    />
  );
}

export default SecondaryOwnerSelect;
