export const RELATIVE_LOCATION_VALUES = [
  // The owner lives at the same address as the housing
  'same-address',
  'same-commune',
  'same-department',
  'same-region',
  // The owner lives in metropolitan France but not in the same region
  'metropolitan',
  // The owner lives in overseas France but not in the same region
  'overseas',
  // Other cases or missing data
  'other'
] as const;

export type RelativeLocation = (typeof RELATIVE_LOCATION_VALUES)[number];
