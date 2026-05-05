import { VACANCY_RATE_VALUES } from '@zerologementvacant/models';
import type { VacancyRate } from '@zerologementvacant/models';
import { VACANCY_RATE_OPTIONS } from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type VacancyRateSelectProps<Multiple extends boolean> = Pick<
  SelectProps<VacancyRate, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function VacancyRateSelect<Multiple extends boolean = false>(
  props: VacancyRateSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={VACANCY_RATE_VALUES}
      label="Taux de vacance"
      getOptionLabel={(option) => VACANCY_RATE_OPTIONS[option].label}
    />
  );
}

export default VacancyRateSelect;
