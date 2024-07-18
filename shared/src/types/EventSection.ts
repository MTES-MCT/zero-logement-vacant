export type EventSection =
  | 'Situation'
  | 'Suivi de campagne'
  | 'Propriétaire'
  | 'Coordonnées propriétaire'
  | 'Ajout d’un logement dans un groupe'
  | 'Retrait du logement d’un groupe'
  | 'Archivage d’un groupe'
  | 'Suppression d’un groupe';

export const EventSections: EventSection[] = [
  'Situation',
  'Suivi de campagne',
  'Propriétaire',
  'Coordonnées propriétaire',
  'Ajout d’un logement dans un groupe',
  'Retrait du logement d’un groupe',
  'Archivage d’un groupe',
  'Suppression d’un groupe'
];
