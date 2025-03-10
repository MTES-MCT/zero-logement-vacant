import { VACANCY_YEAR_VALUES, VacancyYear } from '@zerologementvacant/models';
import { VACANCY_YEAR_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type VacancyYearSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<VacancyYear, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function VacancyYearSelect<Multiple extends boolean = false>(
  props: VacancyYearSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={VACANCY_YEAR_VALUES}
      label="Année de début de vacance"
      getOptionLabel={(option) => VACANCY_YEAR_OPTIONS[option].label}
    />
  );
}

export default VacancyYearSelect;
