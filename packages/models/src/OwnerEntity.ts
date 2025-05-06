export const OWNER_ENTITY_VALUES = [
  'personnes-morales-non-remarquables',
  'etat',
  'region',
  'departement',
  'commune',
  'office-hlm',
  'personnes-morales-representant-des-societes',
  'coproprietaire',
  'associe',
  'etablissements-publics-ou-organismes-assimiles',
  'personnes-physiques'
] as const;
export type OwnerEntity = (typeof OWNER_ENTITY_VALUES)[number];
