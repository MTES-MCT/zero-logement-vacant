export const COLOR_FAMILY_VALUES = [
  'blue-france',
  'red-marianne',
  'green-tilleul-verveine',
  'green-bourgeon',
  'green-emeraude',
  'green-menthe',
  'green-archipel',
  'blue-ecume',
  'blue-cumulus',
  'purple-glycine',
  'pink-macaron',
  'pink-tuile',
  'yellow-tournesol',
  'yellow-moutarde',
  'orange-terre-battue',
  'brown-cafe-creme',
  'brown-caramel',
  'brown-opera',
  'beige-gris-galet'
] as const;
export type ColorFamily = (typeof COLOR_FAMILY_VALUES)[number];
