export interface HousingPayloadDTO {
  localId: string;
}

export const HOUSING_SOURCES = [
  'lovac',
  'datafoncier-manual',
  'datafoncier-import'
] as const;

export type HousingSource = (typeof HOUSING_SOURCES)[number];
