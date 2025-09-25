import { Order } from 'effect';

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

const ESTABLISHMENT_KIND_ORDER: Record<EstablishmentKind, number> = {
  // Regional level
  REG: 1, // Région
  SDER: 2, // Service Déconcentré de l'État Régional

  // Departmental level
  DEP: 3, // Département
  "Service déconcentré de l'État à compétence (inter) départementale": 4,
  SDED: 5, // Service Déconcentré de l'État Départemental

  // Intercommunal level (from largest to smallest)
  ME: 6, // Métropole
  CU: 7, // Communauté Urbaine
  CA: 8, // Communauté d'Agglomération
  CC: 9, // Communauté de Communes
  CTU: 10, // Communauté de Transport Urbain

  // Territorial cooperation
  PETR: 11, // Pôle d'Équilibre Territorial et Rural
  SIVOM: 12, // Syndicat Intercommunal à Vocation Multiple (Multi-purpose Intercommunal Syndicate)

  // Municipal level
  Commune: 13,
  ASSO: 14
};
export const byKindDesc = Order.mapInput(
  Order.number,
  (kind: EstablishmentKind) => ESTABLISHMENT_KIND_ORDER[kind]
);
export const byKind = Order.reverse(byKindDesc);
