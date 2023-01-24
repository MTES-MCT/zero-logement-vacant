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
