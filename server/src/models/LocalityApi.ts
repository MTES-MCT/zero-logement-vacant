import { LocalityKind } from '@zerologementvacant/models';

export interface LocalityApi {
  id: string;
  geoCode: string;
  name: string;
  kind: LocalityKind | null;
  taxKind: TaxKindsApi;
  taxRate?: number;
}

export enum TaxKindsApi {
  TLV = 'TLV',
  THLV = 'THLV',
  None = 'None'
}
