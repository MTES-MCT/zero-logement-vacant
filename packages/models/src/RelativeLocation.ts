export const RELATIVE_LOCATION_VALUES = [
  'same-address',
  'same-commune',
  'same-department',
  'same-region',
  // The owner lives in metropolitan France but not in the same region
  'metropolitan',
  // The owner lives in overseas France but not in the same region
  'overseas',
  // The owner lives in a foreign country
  'foreign-country',
  // Other cases or missing data
  'other'
] as const;

export type RelativeLocation = (typeof RELATIVE_LOCATION_VALUES)[number];

export const RELATIVE_LOCATION_FILTER_VALUES = [
  'same-address',
  'same-commune',
  'same-department',
  'same-region',
  'other-region',
  'foreign-country',
  'other'
] as const;
export type RelativeLocationFilter =
  (typeof RELATIVE_LOCATION_FILTER_VALUES)[number];

export const RELATIVE_LOCATION_LABELS: Record<RelativeLocation, string> = {
  'same-address': 'Habite la même adresse',
  'same-commune': 'Habite dans la même commune',
  'same-department': 'Habite dans le même département',
  'same-region': 'Habite dans la même région',
  metropolitan: 'Habite dans une autre région',
  overseas: 'Habite dans une autre région',
  'foreign-country': 'Habite à l\u2019étranger',
  other: 'Pas d\u2019information'
};
