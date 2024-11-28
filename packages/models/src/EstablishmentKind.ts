export const ESTABLISHMENT_KIND_VALUES = [
  "Service déconcentré de l'État à compétence (inter) départementale",
  'CA',
  'CC',
  'CU',
  'PETR',
  'SDER',
  'REG',
  'EPCI',
  'ASSO',
  'Commune',
  'DEP',
  'ME',
  'SDED',
  'SIVOM',
  'CTU'
] as const;

export type EstablishmentKind = (typeof ESTABLISHMENT_KIND_VALUES)[number];
