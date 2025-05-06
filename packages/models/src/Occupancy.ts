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
