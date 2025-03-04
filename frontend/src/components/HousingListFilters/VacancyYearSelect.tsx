import { VacancyYear } from '@zerologementvacant/models';
import { vacancyYearOptions } from '../../models/HousingFilters';
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
  const options: VacancyYear[] = vacancyYearOptions.map(
    (option) => option.value
  );

  return (
    <AppSelectNext
      {...props}
      options={options}
      label="Année de début de vacance"
    />
  );
}

export default VacancyYearSelect;
