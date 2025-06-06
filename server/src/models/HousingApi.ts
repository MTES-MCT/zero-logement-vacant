import {
  HousingDTO,
  HousingStatus,
  Occupancy,
  Precision
} from '@zerologementvacant/models';
import fp from 'lodash/fp';
import { assert, MarkRequired } from 'ts-essentials';
import OwnerMissingError from '~/errors/ownerMissingError';
import { HousingEventApi, isUserModified } from '~/models/EventApi';
import { OwnerApi, toOwnerDTO } from './OwnerApi';
import { Sort } from './SortApi';

export type HousingId = Pick<HousingRecordApi, 'geoCode' | 'id'>;

export interface HousingRecordApi extends Omit<HousingDTO, 'owner'> {
  plotId: string | null;
  buildingId: string | null;
  buildingGroupId: string | null;
  geolocation: string | null;
  /**
   * @deprecated See {@link precisions}
   */
  deprecatedVacancyReasons: string[] | null;
  /**
   * @deprecated See {@link precisions}
   */
  deprecatedPrecisions: string[] | null;
  occupancyRegistered: Occupancy;
}

export interface HousingApi extends HousingRecordApi {
  localityKind?: string | null;
  geoPerimeters?: string[] | null;
  owner?: OwnerApi;
  buildingHousingCount?: number | null;
  buildingVacancyRate?: number | null;
  campaignIds?: string[] | null;
  contactCount?: number | null;
  lastContact?: Date | null;
  /**
   * Added by joining with the `housing_precisions` and `precisions` tables
   */
  precisions?: Precision[];
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
    campaignIds: housing.campaignIds,
    cadastralClassification: housing.cadastralClassification,
    cadastralReference: housing.cadastralReference,
    uncomfortable: housing.uncomfortable,
    vacancyStartYear: housing.vacancyStartYear,
    housingKind: housing.housingKind,
    roomsCount: housing.roomsCount,
    livingArea: housing.livingArea,
    buildingYear: housing.buildingYear,
    taxed: housing.taxed,
    dataYears: housing.dataYears,
    dataFileYears: housing.dataFileYears,
    beneficiaryCount: housing.beneficiaryCount,
    buildingLocation: housing.buildingLocation,
    rentalValue: housing.rentalValue,
    ownershipKind: housing.ownershipKind,
    status: housing.status,
    subStatus: housing.subStatus,
    energyConsumption: housing.energyConsumption,
    energyConsumptionAt: housing.energyConsumptionAt,
    occupancy: housing.occupancy,
    occupancyIntended: housing.occupancyIntended,
    source: housing.source,
    owner: toOwnerDTO(housing.owner),
    mutationDate: housing.mutationDate,
    lastMutationDate: housing.lastMutationDate,
    lastTransactionDate: housing.lastTransactionDate,
    lastTransactionValue: housing.lastTransactionValue
  };
}

export function assertOwner<T extends HousingApi>(
  housing: T
): asserts housing is T & MarkRequired<T, 'owner'> {
  assert(housing.owner !== undefined, 'Housing owner is undefined');
}

export type HousingSortableApi = Pick<
  HousingApi,
  'owner' | 'occupancy' | 'status'
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
  if (housing.status === HousingStatus.IN_PROGRESS) {
    return (
      housing.subStatus === 'En accompagnement' ||
      housing.subStatus === 'Intervention publique'
    );
  }

  if (housing.status === HousingStatus.COMPLETED) {
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
