import { OwnerDTO } from './OwnerDTO';
import { OwnershipKind } from './OwnershipKind';
import { HousingStatus } from './HousingStatus';
import { EnergyConsumption } from './EnergyConsumption';
import { Occupancy } from './Occupancy';

// TODO: complete this type
export interface HousingDTO {
  id: string;
  invariant: string;
  localId: string;
  rawAddress: string[];
  geoCode: string;
  longitude?: number;
  latitude?: number;
  cadastralClassification?: number;
  uncomfortable: boolean;
  vacancyStartYear?: number;
  housingKind: string;
  roomsCount: number;
  livingArea: number;
  cadastralReference?: string;
  buildingYear?: number;
  taxed?: boolean;
  vacancyReasons?: string[];
  dataYears: number[];
  beneficiaryCount?: number;
  buildingLocation?: string;
  rentalValue?: number;
  ownershipKind?: OwnershipKind;
  status: HousingStatus;
  subStatus?: string;
  precisions?: string[];
  energyConsumption?: EnergyConsumption;
  energyConsumptionAt?: Date;
  occupancy: Occupancy;
  occupancyIntended?: Occupancy;
  source: HousingSource | null;
  owner: OwnerDTO;
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
