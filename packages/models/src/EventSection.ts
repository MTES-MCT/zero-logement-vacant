export const EVENT_SECTION_VALUES = [
  'Situation',
  'Suivi de campagne',
  'Propriétaire',
  'Coordonnées propriétaire',
  'Ajout d’un logement dans un groupe',
  'Retrait du logement d’un groupe',
  'Archivage d’un groupe',
  'Suppression d’un groupe'
] as const;

export type EventSection = (typeof EVENT_SECTION_VALUES)[number];
