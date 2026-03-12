import { Order } from 'effect';

export const ESTABLISHMENT_KIND_VALUES = [
  'ARR', // Arrondissement
  'CA', // Communauté d'Agglomération
  'CC', // Communauté de Communes
  'COM', // Commune
  'COM-TOM', // Commune d'Outre-Mer
  'CU', // Communauté Urbaine
  'DEP', // Département
  'EPT', // Établissement Public Territorial
  'METRO', // Métropole
  'REG', // Région
  'TOM' // Territoire d'Outre-Mer
] as const;

export type EstablishmentKind = (typeof ESTABLISHMENT_KIND_VALUES)[number];

const ESTABLISHMENT_KIND_ORDER: Record<EstablishmentKind, number> = {
  // Regional level
  REG: 1, // Région
  TOM: 2, // Territoire d'Outre-Mer

  // Departmental level
  DEP: 3, // Département

  // Intercommunal level (from largest to smallest)
  METRO: 4, // Métropole
  CU: 5, // Communauté Urbaine
  CA: 6, // Communauté d'Agglomération
  CC: 7, // Communauté de Communes
  EPT: 8, // Établissement Public Territorial

  // Municipal level
  COM: 9, // Commune
  'COM-TOM': 10, // Commune d'Outre-Mer
  ARR: 11 // Arrondissement
};
export const byKindDesc = Order.mapInput(
  Order.number,
  (kind: EstablishmentKind) => ESTABLISHMENT_KIND_ORDER[kind]
);
export const byKind = Order.reverse(byKindDesc);
