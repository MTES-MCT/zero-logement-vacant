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
  buildingLocation?: string;
  ownershipKind?: OwnershipKindsApi;
  status: HousingStatusApi;
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
  !_.isEqual(housing.vacancyReasons, housingUpdate.vacancyReasons);

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

const trimStartingZeros = (str: string): string => str.replace(/^0+/, '');

export function getBuildingLocation(housing: HousingApi) {
  const buildingCharLength =
    housing.buildingLocation?.length === 11
      ? 2
      : housing.buildingLocation?.length === 10
      ? 1
      : undefined;

  if (
    buildingCharLength !== undefined &&
    housing.buildingLocation &&
    housing.buildingLocation !== 'A010001001'
  ) {
    const BUILDING_REGEXP = new RegExp(
      `([A-Z0-9]{1,${buildingCharLength}})([0-9]{2})([0-9]{2})([0-9]{5})`
    );
    const match = housing.buildingLocation.match(BUILDING_REGEXP);
    if (match) {
      const [building, entrance, level, local] = match.slice(1);
      return {
        building: `Bâtiment ${building}`,
        entrance: `Entrée ${trimStartingZeros(entrance)}`,
        level:
          level === '00'
            ? 'Rez-de-chaussée'
            : level === '01'
            ? '1er étage'
            : `${trimStartingZeros(level)}ème étage`,
        local: `Local ${trimStartingZeros(local)}`,
      };
    }
  }
}
