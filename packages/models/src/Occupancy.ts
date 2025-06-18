export enum Occupancy {
  COMMERCIAL_OR_OFFICE = 'T',
  DEMOLISHED_OR_DIVIDED = 'D',
  DEPENDENCY = 'N',
  OTHERS = 'A',
  PRIMARY_RESIDENCE = 'P',
  RENT = 'L',
  SECONDARY_RESIDENCE = 'RS',
  SHORT_RENT = 'B',
  UNKNOWN = 'inconnu',
  VACANT = 'V'
}

export const OCCUPANCY_VALUES: Occupancy[] = Object.values(Occupancy);

export const OCCUPANCY_LABELS: Record<Occupancy, string> = {
  [Occupancy.VACANT]: 'Vacant',
  [Occupancy.RENT]: 'En location',
  [Occupancy.SHORT_RENT]: 'Meublé de tourisme',
  [Occupancy.PRIMARY_RESIDENCE]: 'Occupé par le propriétaire',
  [Occupancy.SECONDARY_RESIDENCE]: 'Résidence secondaire non louée',
  [Occupancy.COMMERCIAL_OR_OFFICE]: 'Local commercial ou bureau',
  [Occupancy.DEPENDENCY]: 'Dépendance',
  [Occupancy.DEMOLISHED_OR_DIVIDED]: 'Local démoli ou divisé',
  [Occupancy.OTHERS]: 'Autres',
  [Occupancy.UNKNOWN]: 'Pas d’information'
};
