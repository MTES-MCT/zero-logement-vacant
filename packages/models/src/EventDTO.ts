import { EventCategory } from './EventCategory';
import { EventKind } from './EventKind';
import { EventSection } from './EventSection';
import { UserDTO } from './UserDTO';

export interface EventDTO<T> {
  id: string;
  name: EventName;
  kind: EventKind;
  category: EventCategory;
  section: EventSection;
  conflict?: boolean;
  old?: T;
  new?: T;
  createdAt: Date;
  createdBy: string;
  creator?: UserDTO;
}

export const EVENT_NAME_VALUES = [
  'Modification arborescence de suivi',
  'Ajout dans un groupe',
  'Absent du millésime 2023',
  'Changement de propriétaires',
  'Ajout dans une campagne',
  'Suppression d’un groupe',
  'Changement de statut de suivi',
  'Changement de statut d’occupation',
  'Changement de propriétaire principal',
  "Modification du statut d'occupation",
  'Archivage d’un groupe',
  'Retrait d’un groupe',
  'Modification de coordonnées',
  'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
  "Modification d'identité",
  'Modification du statut de la campagne',
  'Création du logement',
  "Création d'un nouveau propriétaire",
  'Conflit d’informations possible venant d’une source externe concernant le propriétaire et/ou la propriété'
] as const;
export type EventName = (typeof EVENT_NAME_VALUES)[number];
