export interface HousingPayloadDTO {
  localId: string;
}

export type HousingSource =
  | 'lovac'
  | 'datafoncier-manual'
  | 'datafoncier-import';

export const HOUSING_SOURCES: HousingSource[] = [
  'lovac',
  'datafoncier-manual',
  'datafoncier-import'
];
