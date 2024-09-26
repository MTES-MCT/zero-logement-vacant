export const OWNER_AGE_VALUES = [
  'lt40',
  '40to59',
  '60to74',
  '75to99',
  'gte100'
] as const;

export type OwnerAge = (typeof OWNER_AGE_VALUES)[number];
