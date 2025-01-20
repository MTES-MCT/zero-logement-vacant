export const PRECISION_CATEGORY_VALUES = [
  'dispositifs-incitatifs',
  'dispositifs-coercitifs',
  'hors-dispositif-public',
  'blocage-involontaire',
  'blocage-volontaire',
  'immeuble-environnement',
  'tiers-en-cause',
  'travaux',
  'occupation',
  'mutation'
] as const;

export type PrecisionCategory = (typeof PRECISION_CATEGORY_VALUES)[number];

export const PRECISION_MECHANISM_CATEGORY_VALUES: ReadonlyArray<PrecisionCategory> =
  [
    'dispositifs-incitatifs',
    'dispositifs-coercitifs',
    'hors-dispositif-public'
  ];
export const PRECISION_BLOCKING_POINT_CATEGORY_VALUES: ReadonlyArray<PrecisionCategory> =
  [
    'blocage-involontaire',
    'blocage-volontaire',
    'immeuble-environnement',
    'tiers-en-cause'
  ];
export const PRECISION_EVOLUTION_CATEGORY_VALUES: ReadonlyArray<PrecisionCategory> =
  ['travaux', 'occupation', 'mutation'];

export interface Precision {
  id: string;
  category: PrecisionCategory;
  label: string;
}
