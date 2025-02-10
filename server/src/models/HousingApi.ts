import fp from 'lodash/fp';
import { assert, MarkRequired } from 'ts-essentials';

import {
  HousingDTO,
  HousingKind,
  HousingSource,
  Occupancy
} from '@zerologementvacant/models';
import { OwnerApi, toOwnerDTO } from './OwnerApi';
import { HousingStatusApi, toHousingStatus } from './HousingStatusApi';
import { Sort } from './SortApi';
import { HousingEventApi, isUserModified } from '~/models/EventApi';
import OwnerMissingError from '~/errors/ownerMissingError';

export type HousingId = Pick<HousingRecordApi, 'geoCode' | 'id'>;

export interface HousingRecordApi {
  id: string;
  /**
   * @deprecated Shall be replaced by `localId`
   */
  invariant: string;
  localId: string;
  plotId?: string;
  buildingId?: string;
  buildingGroupId?: string;
  /**
   * @deprecateds Should become `addressDGFIP: string`
   */
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
  mutationDate: Date | null;
  taxed?: boolean;
  vacancyReasons?: string[] | null;
  /**
   * @deprecated See {@link dataFileYears}
   */
  dataYears: number[];
  dataFileYears: string[];
  beneficiaryCount?: number;
  buildingLocation?: string;
  rentalValue?: number;
  geolocation?: string;
  ownershipKind?: string;
  status: HousingStatusApi;
  subStatus?: string | null;
  /**
   * @deprecated To be replaced by the `precisions`
   * and the `housing_precisions` tables
   */
  precisions?: string[] | null;
  energyConsumption?: EnergyConsumptionGradesApi;
  energyConsumptionAt?: Date;
  occupancy: Occupancy;
  occupancyRegistered: Occupancy;
  occupancyIntended?: Occupancy | null;
  source: HousingSource | null;
}

export interface HousingApi extends HousingRecordApi {
  localityKind?: string;
  geoPerimeters?: string[];
  owner?: OwnerApi;
  buildingHousingCount?: number;
  buildingVacancyRate?: number;
  campaignIds?: string[];
  contactCount?: number;
  lastContact?: Date;
}

export function toHousingDTO(housing: HousingApi): HousingDTO {
  if (!housing.owner) {
    throw new OwnerMissingError();
  }

  return {
    id: housing.id,
    invariant: housing.invariant,
    localId: housing.localId,
    rawAddress: housing.rawAddress,
    geoCode: housing.geoCode,
    longitude: housing.longitude,
    latitude: housing.latitude,
    cadastralClassification: housing.cadastralClassification,
    uncomfortable: housing.uncomfortable,
    vacancyStartYear: housing.vacancyStartYear,
    housingKind: housing.housingKind as HousingKind,
    roomsCount: housing.roomsCount,
    livingArea: housing.livingArea,
    cadastralReference: housing.cadastralReference,
    buildingYear: housing.buildingYear,
    taxed: housing.taxed,
    vacancyReasons: housing.vacancyReasons ?? null,
    dataYears: housing.dataYears,
    dataFileYears: housing.dataFileYears,
    beneficiaryCount: housing.beneficiaryCount,
    buildingLocation: housing.buildingLocation,
    rentalValue: housing.rentalValue,
    ownershipKind: housing.ownershipKind,
    status: toHousingStatus(housing.status),
    subStatus: housing.subStatus ?? null,
    precisions: housing.precisions ?? null,
    energyConsumption: housing.energyConsumption,
    energyConsumptionAt: housing.energyConsumptionAt,
    occupancy: housing.occupancy,
    occupancyIntended: housing.occupancyIntended ?? null,
    source: housing.source,
    owner: toOwnerDTO(housing.owner)
  };
}

export function assertOwner<T extends HousingApi>(
  housing: T
): asserts housing is T & MarkRequired<T, 'owner'> {
  assert(housing.owner !== undefined, 'Housing owner is undefined');
}

export type HousingSortableApi = Pick<
  HousingApi,
  'owner' | 'rawAddress' | 'occupancy' | 'status'
>;
export type HousingSortApi = Sort<HousingSortableApi>;

export enum OwnershipKindsApi {
  Single = 'single',
  CoOwnership = 'co',
  Other = 'other'
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
  [OwnershipKindsApi.Other]: ['BND', 'CLV', 'CV', 'MP', 'TF']
};

export enum OccupancyKindApi {
  Unknown = 'inconnu',
  Vacant = 'V',
  Rent = 'L',
  ShortRent = 'B',
  PrimaryResidence = 'P',
  SecondaryResidence = 'RS',
  CommercialOrOffice = 'T',
  Dependency = 'N',
  DemolishedOrDivided = 'D',
  Others = 'A'
}

export const OccupancyKindApiLabels: Record<OccupancyKindApi, string> = {
  [OccupancyKindApi.Unknown]: 'Pas d’information',
  [OccupancyKindApi.Vacant]: 'Vacant',
  [OccupancyKindApi.Rent]: 'En location',
  [OccupancyKindApi.ShortRent]: 'Meublé de tourisme',
  [OccupancyKindApi.PrimaryResidence]: 'Occupé par le propriétaire',
  [OccupancyKindApi.SecondaryResidence]: 'Résidence secondaire non louée',
  [OccupancyKindApi.CommercialOrOffice]: 'Local commercial ou bureau',
  [OccupancyKindApi.Dependency]: 'Dépendance',
  [OccupancyKindApi.DemolishedOrDivided]: 'Local démoli ou divisé',
  [OccupancyKindApi.Others]: 'Autres'
};

export enum EnergyConsumptionGradesApi {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G'
}

export const ENERGY_CONSUMPTION_GRADES = Object.values(
  EnergyConsumptionGradesApi
);

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
        local: `Local ${trimStartingZeros(local)}`
      };
    }
  }
}

export function hasCampaigns(housing: HousingApi): boolean {
  return !!housing.campaignIds?.length;
}

export function isSupervised(
  housing: HousingApi,
  events: ReadonlyArray<HousingEventApi>
): boolean {
  if (housing.status === HousingStatusApi.InProgress) {
    return (
      housing.subStatus === 'En accompagnement' ||
      housing.subStatus === 'Intervention publique'
    );
  }

  if (housing.status === HousingStatusApi.Completed) {
    return (
      (housing.subStatus === 'N’était pas vacant' ||
        housing.subStatus === 'Sortie de la vacance') &&
      events.some(isUserModified)
    );
  }

  return false;
}

export function normalizeDataFileYears(dataFileYears: string[]): string[] {
  return fp.pipe(fp.sortBy<string>(fp.identity), fp.sortedUniq)(dataFileYears);
}
