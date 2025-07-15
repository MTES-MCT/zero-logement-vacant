export const VACANCY_YEAR_VALUES = [
  '2022',
  '2021',
  '2020',
  '2019',
  '2018to2015',
  '2014to2010',
  'before2010',
  'missingData',
  'inconsistency2022'
] as const;

export type VacancyYear = (typeof VACANCY_YEAR_VALUES)[number];
