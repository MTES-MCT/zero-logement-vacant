import { OwnerDTO } from './OwnerDTO';

export interface HousingDTO {
  id: string;
  geoCode: string;
  localId: string;
  owner: OwnerDTO;
  // TODO: complete this type
}

export interface HousingCountDTO {
  housing: number;
  owners: number;
}

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
  'datafoncier-import',
];
