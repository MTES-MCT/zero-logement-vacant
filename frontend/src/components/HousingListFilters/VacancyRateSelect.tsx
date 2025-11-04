import { VACANCY_RATE_VALUES } from '@zerologementvacant/models';
import type { VacancyRate } from '@zerologementvacant/models';
import { VACANCY_RATE_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type VacancyRateSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<VacancyRate, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function VacancyRateSelect<Multiple extends boolean = false>(
  props: VacancyRateSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={VACANCY_RATE_VALUES}
      label="Taux de vacance"
      getOptionLabel={(option) => VACANCY_RATE_OPTIONS[option].label}
    />
  );
}

export default VacancyRateSelect;
