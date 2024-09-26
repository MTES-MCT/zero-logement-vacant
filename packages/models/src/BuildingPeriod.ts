export const BUILDING_PERIOD_VALUES = [
  'lt1919',
  '1919to1945',
  '1946to1990',
  'gte1991'
] as const;

export type BuildingPeriod = (typeof BUILDING_PERIOD_VALUES)[number];
