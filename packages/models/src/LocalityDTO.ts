export const LOCALITY_KIND_VALUES = ['ACV', 'PVD'] as const;

export type LocalityKind = (typeof LOCALITY_KIND_VALUES)[number];

export const TAX_KIND_VALUES = ['TLV', 'THLV', 'None'] as const;

export type TaxKind = (typeof TAX_KIND_VALUES)[number];

export interface LocalityDTO {
  geoCode: string;
  name: string;
  kind: LocalityKind | null;
  taxKind: TaxKind;
  taxRate?: number;
}
