import { VACANCY_YEAR_VALUES } from '@zerologementvacant/models';
import type { VacancyYear } from '@zerologementvacant/models';
import { VACANCY_YEAR_OPTIONS } from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type VacancyYearSelectProps<Multiple extends boolean> = Pick<
  SelectProps<VacancyYear, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function VacancyYearSelect<Multiple extends boolean = false>(
  props: VacancyYearSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={VACANCY_YEAR_VALUES}
      label="Année de début de vacance"
      getOptionLabel={(option) => VACANCY_YEAR_OPTIONS[option].label}
    />
  );
}

export default VacancyYearSelect;
