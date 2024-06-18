export enum Occupancy {
  Unknown = 'inconnu',
  Vacant = 'V',
  Rent = 'L',
  ShortRent = 'B',
  PrimaryResidence = 'P',
  SecondaryResidence = 'RS',
  CommercialOrOffice = 'T',
  Dependency = 'N',
  DemolishedOrDivided = 'D',
  Others = 'A'
}

export const OCCUPANCIES: Occupancy[] = Object.values(Occupancy);
