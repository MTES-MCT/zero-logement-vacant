export const VACANCY_RATE_VALUES = [
  'lt20',
  '20to39',
  '40to59',
  '60to79',
  'gte80'
] as const;

export type VacancyRate = (typeof VACANCY_RATE_VALUES)[number];
