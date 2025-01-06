export const OWNER_KIND_VALUES = [
  'Particulier',
  'SCI, Copropriété, Autres personnes morales',
  'Promoteur, Investisseur privé',
  'Etat et collectivité territoriale',
  'Bailleur social, Aménageur, Investisseur public',
  'Autres',
  'Absence de propriétaire'
] as const;

export type OwnerKind = (typeof OWNER_KIND_VALUES)[number];
