export enum Occupancy {
  UNKNOWN = 'unknown',
  VACANT = 'V',
  RENT = 'L',
  SHORT_RENT = 'B',
  PRIMARY_RESIDENCE = 'P',
  SECONDARY_RESIDENCE = 'RS',
  COMMERCIAL_OR_OFFICE = 'T',
  DEPENDENCY = 'N',
  DEMOLISHED_OR_DIVIDED = 'D',
  OTHERS = 'A',
}

export const OCCUPANCY_VALUES: Occupancy[] = Object.values(Occupancy);
