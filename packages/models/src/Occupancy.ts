export enum Occupancy {
  VACANT = 'V',
  RENT = 'L',
  SHORT_RENT = 'B',
  SECONDARY_RESIDENCE = 'RS',
  PRIMARY_RESIDENCE = 'P',
  DEPENDENCY = 'N',
  COMMERCIAL_OR_OFFICE = 'T',
  DEMOLISHED_OR_DIVIDED = 'D',
  OTHERS = 'A',
  UNKNOWN = 'inconnu'
}

export const OCCUPANCY_VALUES: Occupancy[] = Object.values(Occupancy);
