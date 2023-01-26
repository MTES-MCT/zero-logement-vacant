export interface LocalityApi {
  geoCode: string;
  name: string;
  taxKind: TaxKindsApi;
  taxRate?: number;
}

export enum TaxKindsApi {
  TLV = 'TLV',
  THLV = 'THLV',
  None = 'None',
}
