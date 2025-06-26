export const OWNER_KIND_VALUES = [
  'absent',
  'particulier',
  'sci-copro',
  'promoteur',
  'etat-collectivite',
  'bailleur-social',
  'autres'
] as const;

export type OwnerKind = (typeof OWNER_KIND_VALUES)[number];

export const OWNER_KIND_LABELS: Record<OwnerKind, string> = {
  particulier: 'Particulier',
  'sci-copro': 'SCI, Copropriété, Autres personnes morales',
  promoteur: 'Promoteur, Investisseur privé',
  'etat-collectivite': 'Etat et collectivité territoriale',
  'bailleur-social': 'Bailleur social, Aménageur, Investisseur public',
  autres: 'Autres',
  absent: 'Absence de propriétaire'
};
