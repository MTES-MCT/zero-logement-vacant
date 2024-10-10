export const ESTABLISHMENT_KIND_VALUES = [
  'Commune',
  'EPCI',
  'DDT',
  'DDTM',
  'DREAL',
  'DRIHL',
  'DRIEAT',
  'DTAM'
] as const;

export type EstablishmentKind = (typeof ESTABLISHMENT_KIND_VALUES)[number];
