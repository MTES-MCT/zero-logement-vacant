export const ESTABLISHMENT_SOURCE_VALUES = [
  'seed',
  'manual',
  'cerema'
] as const;

export type EstablishmentSource = (typeof ESTABLISHMENT_SOURCE_VALUES)[number];
