import { Order } from 'effect';

export const ESTABLISHMENT_KIND_VALUES = [
  'ARR', // Arrondissement
  'CA', // Communauté d'Agglomération
  'CC', // Communauté de Communes
  'COM', // Commune
  'COM-TOM', // Commune d'Outre-Mer
  'CTU', // Collectivité Territoriale Unique
  'CU', // Communauté Urbaine
  'DEP', // Département
  'EPT', // Établissement Public Territorial
  'METRO', // Métropole
  'PETR', // Pôle d'Équilibre Territorial et Rural
  'REG', // Région
  'SDED', // Service déconcentré de l'État à compétence (inter)départementale
  'SDER', // Service déconcentré de l'État à compétence (inter)régionale
  'SIVOM', // Syndicat Intercommunal à Vocation Multiple
  'TOM' // Territoire d'Outre-Mer
] as const;

export type EstablishmentKind = (typeof ESTABLISHMENT_KIND_VALUES)[number];

const ESTABLISHMENT_KIND_ORDER: Record<EstablishmentKind, number> = {
  // Regional level
  REG: 1, // Région
  TOM: 2, // Territoire d'Outre-Mer
  SDER: 3, // Service déconcentré de l'État à compétence (inter)régionale
  CTU: 4, // Collectivité Territoriale Unique

  // Departmental level
  DEP: 5, // Département
  SDED: 6, // Service déconcentré de l'État à compétence (inter)départementale

  // Intercommunal level (from largest to smallest)
  METRO: 7, // Métropole
  CU: 8, // Communauté Urbaine
  CA: 9, // Communauté d'Agglomération
  CC: 10, // Communauté de Communes
  EPT: 11, // Établissement Public Territorial
  PETR: 12, // Pôle d'Équilibre Territorial et Rural
  SIVOM: 13, // Syndicat Intercommunal à Vocation Multiple

  // Municipal level
  COM: 14, // Commune
  'COM-TOM': 15, // Commune d'Outre-Mer
  ARR: 16 // Arrondissement
};
export const byKindDesc = Order.mapInput(
  Order.number,
  (kind: EstablishmentKind) => ESTABLISHMENT_KIND_ORDER[kind]
);
export const byKind = Order.reverse(byKindDesc);
