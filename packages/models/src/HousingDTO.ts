import { OwnerDTO } from './OwnerDTO';
import { Occupancy } from './Occupancy';
import { HousingKind } from './HousingKind';
import { HousingStatus } from './HousingStatus';

export interface HousingDTO {
  id: string;
  geoCode: string;
  localId: string;
  owner: OwnerDTO;
  rawAddress: string[];
  occupancy: Occupancy;
  kind: HousingKind;
  status: HousingStatus;
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
  'datafoncier-import'
];
