import { EventPayloads } from './EventPayloads';
import { EventType } from './EventType';
import { UserDTO } from './UserDTO';

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
  'Modification du logement',
  "Création d'un nouveau propriétaire",
  'Conflit d’informations possible venant d’une source externe concernant le propriétaire et/ou la propriété',
  // New events
  'Ajout d’une précision au logement',
  'Retrait d’une précision du logement',
  'Propriétaire ajouté au logement',
  'Propriétaire retiré du logement',
  'Propriétaire mis à jour',
  'Modification de la campagne',
  'Retrait d’une campagne',
  // Document events
  'Création d’un document',
  'Modification d’un document',
  'Suppression d’un document',
  'Ajout d’un document au logement',
  'Retrait d’un document du logement',
  'Suppression d’un document du logement'
] as const;
export type EventName = (typeof EVENT_NAME_VALUES)[number];

export interface EventDTO<Type extends EventType = EventType> {
  id: string;
  name: EventName;
  type: Type;
  conflict?: boolean;
  /**
   * @deprecated Use {@link nextOld} instead.
   */
  old?: never;
  /**
   * @deprecated Use {@link nextNew} instead.
   */
  new?: never;
  nextOld: EventPayloads[Type]['old'];
  nextNew: EventPayloads[Type]['new'];
  createdAt: string;
  createdBy: string;
  creator?: UserDTO;
}

export type EventUnionDTO<Type extends EventType> = Type extends any
  ? EventDTO<Type>
  : never;
