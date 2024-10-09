export const HOUSING_BY_BUILDING_VALUES = [
  'lt5',
  '5to19',
  '20to49',
  'gte50'
] as const;

export type HousingByBuilding = (typeof HOUSING_BY_BUILDING_VALUES)[number];
