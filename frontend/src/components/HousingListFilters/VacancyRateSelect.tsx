import { VACANCY_RATE_VALUES, VacancyRate } from '@zerologementvacant/models';
import { VACANCY_RATE_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

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
