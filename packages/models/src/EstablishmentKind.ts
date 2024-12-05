export const ESTABLISHMENT_KIND_VALUES = [
  'ASSO',
  'CA',
  'CC',
  'Commune',
  'CTU',
  'CU',
  'DEP',
  'ME',
  'PETR',
  'REG',
  'SDED',
  'SDER',
  "Service déconcentré de l'État à compétence (inter) départementale",
  'SIVOM'
] as const;

export type EstablishmentKind = (typeof ESTABLISHMENT_KIND_VALUES)[number];
