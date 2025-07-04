export enum Occupancy {
  VACANT = 'V',
  RENT = 'L',
  SHORT_RENT = 'B',
  SECONDARY_RESIDENCE = 'RS',
  PRIMARY_RESIDENCE = 'P',
  DEPENDENCY = 'N',
  COMMERCIAL_OR_OFFICE = 'T',
  DEMOLISHED_OR_DIVIDED = 'D',
  FREE = 'G',
  CIVIL_SERVANT = 'F',
  ARTISAN = 'R',
  COMMON = 'U',
  RURAL = 'X',
  OTHERS = 'A',
  UNKNOWN = 'inconnu'
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
  [Occupancy.FREE]: 'Occupé à titre gratuit',
  [Occupancy.CIVIL_SERVANT]: 'Fonctionnaire logé',
  [Occupancy.ARTISAN]: 'Occupé par un artisan exonéré',
  [Occupancy.COMMON]: 'Utilisation commune',
  [Occupancy.RURAL]: 'Bail rural',
  [Occupancy.OTHERS]: 'Autres',
  [Occupancy.UNKNOWN]: 'Pas d’information'
};
