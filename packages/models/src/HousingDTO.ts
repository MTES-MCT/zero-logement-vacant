import { EnergyConsumption } from './EnergyConsumption';
import { HousingKind } from './HousingKind';
import { HousingStatus } from './HousingStatus';
import { Occupancy } from './Occupancy';
import { OwnerDTO } from './OwnerDTO';

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

export type HousingPayloadDTO = Pick<HousingDTO, 'localId'>;

export type HousingUpdatePayloadDTO =
  // Required keys
  Pick<HousingDTO, 'status' | 'occupancy'> & {
    // Optional, nullable keys
    subStatus?: string | null;
    precisions?: string[] | null;
    vacancyReasons?: string[] | null;
    occupancyIntended?: Occupancy | null;
  };

export interface HousingCountDTO {
  housing: number;
  owners: number;
}

export const HOUSING_SOURCE_VALUES = [
  'lovac',
  'datafoncier-manual',
  'datafoncier-import'
] as const;

export type HousingSource = (typeof HOUSING_SOURCE_VALUES)[number];
