import { OwnerDTO } from './OwnerDTO';
import { HousingStatus } from './HousingStatus';
import { EnergyConsumption } from './EnergyConsumption';
import { Occupancy } from './Occupancy';
import { HousingKind } from './HousingKind';

// TODO: complete this type
export interface HousingDTO {
  id: string;
  localId: string;
  rawAddress: string[];
  geoCode: string;
  longitude?: number;
  latitude?: number;
  cadastralClassification?: number;
  uncomfortable: boolean;
  vacancyStartYear?: number;
  housingKind: HousingKind;
  roomsCount: number;
  livingArea: number;
  cadastralReference?: string;
  buildingYear?: number;
  taxed?: boolean;
  vacancyReasons?: string[];
  /**
   * @deprecated See {@link dataFileYears}
   */
  dataYears: number[];
  dataFileYears: string[];
  beneficiaryCount?: number;
  buildingLocation?: string;
  rentalValue?: number;
  ownershipKind?: string;
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
