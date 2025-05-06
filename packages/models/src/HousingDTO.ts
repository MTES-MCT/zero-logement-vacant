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
  campaignIds?: string[];
  longitude?: number;
  latitude?: number;
  cadastralClassification: number | null;
  cadastralReference?: string;
  uncomfortable: boolean;
  vacancyStartYear?: number;
  housingKind: HousingKind;
  roomsCount: number | null;
  livingArea: number | null;
  buildingYear?: number;
  taxed?: boolean;
  /**
   * @deprecated See {@link dataFileYears}
   */
  dataYears: number[];
  dataFileYears: string[];
  beneficiaryCount?: number;
  buildingLocation?: string | null;
  rentalValue?: number;
  ownershipKind?: string;
  status: HousingStatus;
  subStatus: string | null;
  energyConsumption: EnergyConsumption | null;
  energyConsumptionAt: Date | null;
  occupancy: Occupancy;
  occupancyIntended: Occupancy | null;
  source: HousingSource | null;
  owner: OwnerDTO;
}

export type HousingPayloadDTO = Pick<HousingDTO, 'localId'>;

export type HousingUpdatePayloadDTO =
  // Required keys
  Pick<HousingDTO, 'status' | 'occupancy'> & {
    // Optional, nullable keys
    subStatus?: string | null;
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
