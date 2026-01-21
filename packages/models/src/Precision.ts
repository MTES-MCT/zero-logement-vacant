import { Equivalence } from 'effect';

export interface Precision {
  id: string;
  category: PrecisionCategory;
  label: string;
}

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

export function isPrecisionMechanismCategory(
  category: PrecisionCategory
): category is (typeof PRECISION_MECHANISM_CATEGORY_VALUES)[number] {
  return PRECISION_MECHANISM_CATEGORY_VALUES.includes(category);
}

export function isPrecisionBlockingPointCategory(
  category: PrecisionCategory
): category is (typeof PRECISION_BLOCKING_POINT_CATEGORY_VALUES)[number] {
  return PRECISION_BLOCKING_POINT_CATEGORY_VALUES.includes(category);
}

export function isPrecisionEvolutionCategory(
  category: PrecisionCategory
): category is (typeof PRECISION_EVOLUTION_CATEGORY_VALUES)[number] {
  return PRECISION_EVOLUTION_CATEGORY_VALUES.includes(category);
}

export function isSingleChoicePrecisionCategory(
  category: PrecisionCategory
): boolean {
  return isPrecisionEvolutionCategory(category);
}

/**
 * The equivalence between two precisions is defined by their `id`.
 * @example
 * const actual = PRECISION_EQUIVALENCE(
 *   { id: '123', label: 'A' },
 *   { id: '123', label: 'B' }
 * )
 * expect(actual).toBeTrue()
 */
export const PRECISION_EQUIVALENCE = Equivalence.mapInput<
  Precision,
  Precision['id']
>((precision) => precision.id)(Equivalence.string);

export const PRECISION_CATEGORY_EQUIVALENCE = Equivalence.mapInput<
  Precision,
  Precision['category']
>((precision) => precision.category)(Equivalence.string);