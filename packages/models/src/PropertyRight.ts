export const PROPERTY_RIGHT_VALUES = [
  'proprietaire-entier',
  'usufruitier',
  'nu-proprietaire',
  'administrateur',
  'syndic',
  'associe-sci-ir',
  'autre'
] as const;
export type PropertyRight = (typeof PROPERTY_RIGHT_VALUES)[number];
