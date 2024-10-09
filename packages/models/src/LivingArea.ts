export const LIVING_AREA_VALUES = [
  'lt35',
  '35to74',
  '75to99',
  'gte100'
] as const;

export type LivingArea = (typeof LIVING_AREA_VALUES)[number];
