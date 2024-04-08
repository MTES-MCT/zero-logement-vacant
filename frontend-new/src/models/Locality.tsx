export interface Locality {
  geoCode: string;
  name: string;
  taxKind: TaxKinds;
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

export enum TaxKinds {
  TLV = 'TLV',
  THLV = 'THLV',
  None = 'None',
}
export const TaxKindsLabels = {
  [TaxKinds.TLV]: 'TLV appliquée',
  [TaxKinds.THLV]: 'THLV appliquée',
  [TaxKinds.None]: 'THLV non appliquée',
};
