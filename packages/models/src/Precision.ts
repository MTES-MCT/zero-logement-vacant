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

type Kind = 'mechanism' | 'blockingPoint' | 'evolution';

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

const kinds: Record<Kind, readonly PrecisionCategory[]> = {
  mechanism: PRECISION_MECHANISM_CATEGORY_VALUES,
  blockingPoint: PRECISION_BLOCKING_POINT_CATEGORY_VALUES,
  evolution: PRECISION_EVOLUTION_CATEGORY_VALUES,
};

export function filterByKind(precisions: Precision[], kind: Kind): Precision[] {
  return precisions.filter(precision => kinds[kind].includes(precision.category));
}
