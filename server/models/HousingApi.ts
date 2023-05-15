import { HousingOwnerApi, OwnerApi } from './OwnerApi';
import { HousingStatusApi } from './HousingStatusApi';
import { Sort } from './SortApi';
import _ from 'lodash';

export interface HousingRecordApi {
  id: string;
  invariant: string;
  localId: string;
  rawAddress: string[];
  geoCode: string;
  longitude?: number;
  latitude?: number;
  cadastralClassification: number;
  uncomfortable: boolean;
  vacancyStartYear: number;
  housingKind: string;
  roomsCount: number;
  livingArea: number;
  cadastralReference: string;
  buildingYear?: number;
  taxed: boolean;
  vacancyReasons: string[];
  dataYears: number[];
  buildingLocation: string;
  ownershipKind?: OwnershipKindsApi;
  status?: HousingStatusApi;
  subStatus?: string;
  precisions?: string[];
  energyConsumption?: EnergyConsumptionGradesApi;
  energyConsumptionWorst?: EnergyConsumptionGradesApi;
  occupancy: OccupancyKindApi;
}

export interface HousingApi extends HousingRecordApi {
  localityKind: string;
  geoPerimeters?: string[];
  owner: OwnerApi;
  /**
   * All the owners having rank >= 2
   */
  coowners: HousingOwnerApi[];
  buildingHousingCount?: number;
  buildingVacancyRate?: number;
  campaignIds: string[];
  contactCount: number;
  lastContact?: Date;
}

export interface HousingUpdateApi {
  status: HousingStatusApi;
  subStatus?: string;
  precisions?: string[];
  contactKind: string;
  vacancyReasons?: string[];
  comment: string;
}

export const isHousingUpdated = (
  housing: HousingApi,
  housingUpdate: HousingUpdateApi
) =>
  housing.status !== housingUpdate.status ||
  housing.subStatus !== housingUpdate.subStatus ||
  !_.isEqual(housing.precisions, housingUpdate.precisions) ||
  !_.isEqual(housing.vacancyReasons, housingUpdate.vacancyReasons) ||
  housingUpdate.comment?.length;

export type HousingSortableApi = Pick<HousingApi, 'owner' | 'rawAddress'>;
export type HousingSortApi = Sort<HousingSortableApi>;

export enum OwnershipKindsApi {
  Single = 'single',
  CoOwnership = 'co',
  Other = 'other',
}

export const getOwnershipKindFromValue = (value?: string) => {
  return !value
    ? OwnershipKindsApi.Single
    : OwnershipKindValues[OwnershipKindsApi.CoOwnership].indexOf(value) !== -1
    ? OwnershipKindsApi.CoOwnership
    : OwnershipKindValues[OwnershipKindsApi.Other].indexOf(value) !== -1
    ? OwnershipKindsApi.Other
    : undefined;
};

export const OwnershipKindValues = {
  [OwnershipKindsApi.CoOwnership]: ['CL'],
  [OwnershipKindsApi.Other]: ['BND', 'CLV', 'CV', 'MP', 'TF'],
};

export enum OccupancyKindApi {
  Vacant = 'V',
  Rent = 'L',
}

export enum EnergyConsumptionGradesApi {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
}
