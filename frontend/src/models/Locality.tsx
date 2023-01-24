export interface Locality {
  geoCode: string;
  name: string;
  taxZone?: string;
  taxRate?: number;
}
export enum LocalityKinds {
  ACV = 'ACV',
  PVD = 'PVD',
}

export const LocalityKindLabels = {
  [LocalityKinds.ACV]: 'Action Cœur de Ville',
  [LocalityKinds.PVD]: 'Petites Villes de Demain',
};

export const hasTLV = (locality: Locality) =>
  locality.taxZone !== undefined &&
  locality.taxZone !== '' &&
  locality.taxZone !== 'C';

export const hasTHLV = (locality: Locality) => locality.taxRate !== null;
export const hasNoTax = (locality: Locality) =>
  !hasTLV(locality) && !hasTHLV(locality);
