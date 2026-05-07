export const OWNER_KIND_VALUES = [
  'particulier',
  'sci-copro',
  'promoteur',
  'etat-collectivite',
  'bailleur-social',
  'autres'
] as const;

export type OwnerKind = (typeof OWNER_KIND_VALUES)[number];

export const OWNER_KIND_LABEL_VALUES = [
  'Particulier',
  'SCI, Copropriété, Autres personnes morales',
  'Promoteur, Investisseur privé',
  'Etat et collectivité territoriale',
  'Bailleur social, Aménageur, Investisseur public',
  'Autres'
];
export type OwnerKindLabel = (typeof OWNER_KIND_LABEL_VALUES)[number];
export const OWNER_KIND_LABELS: Record<OwnerKind, OwnerKindLabel> = {
  particulier: 'Particulier',
  'sci-copro': 'SCI, Copropriété, Autres personnes morales',
  promoteur: 'Promoteur, Investisseur privé',
  'etat-collectivite': 'Etat et collectivité territoriale',
  'bailleur-social': 'Bailleur social, Aménageur, Investisseur public',
  autres: 'Autres'
};
