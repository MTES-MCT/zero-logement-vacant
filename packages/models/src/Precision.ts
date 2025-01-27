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

export interface Precision {
  id: string;
  category: PrecisionCategory;
  label: string;
}
