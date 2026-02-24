import {
  DataFileYear,
  HousingDTO,
  HousingKind,
  HousingStatus,
  Occupancy,
  Precision,
  toOccupancy,
  type DatafoncierHousing,
  type HousingSource,
  type OwnershipKindInternal
} from '@zerologementvacant/models';
import { Array, Equivalence, Order, pipe } from 'effect';
import type { Point } from 'geojson';
import { assert, MarkRequired } from 'ts-essentials';
import { v4 as uuidv4 } from 'uuid';

import { HousingEventApi, isUserModified } from '~/models/EventApi';
import { OwnerApi, toOwnerDTO } from '~/models/OwnerApi';
import { Sort } from '~/models/SortApi';
import { diff } from '~/utils/diff';

export type HousingId = Pick<HousingDTO, 'geoCode' | 'id'>;

export interface HousingRecordApi extends Omit<HousingDTO, 'owner'> {
  buildingGroupId: string | null;
  geolocation: Point | null;
  occupancyRegistered: Occupancy;
}

export interface HousingApi extends HousingRecordApi {
  localityKind?: string | null;
  geoPerimeters?: string[] | null;
  owner?: OwnerApi | null;
  buildingHousingCount?: number | null;
  buildingVacancyRate?: number | null;
  campaignIds?: string[] | null;
  contactCount?: number | null;
  /**
   * Added by joining with the `housing_precisions` and `precisions` tables
   */
  precisions?: Precision[];
}

export function toHousingDTO(housing: HousingApi): HousingDTO {
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
    buildingId: housing.buildingId,
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
    actualEnergyConsumption: housing.actualEnergyConsumption,
    energyConsumption: housing.energyConsumption,
    energyConsumptionAt: housing.energyConsumptionAt,
    occupancy: housing.occupancy,
    occupancyIntended: housing.occupancyIntended,
    source: housing.source,
    owner: housing.owner ? toOwnerDTO(housing.owner) : null,
    lastMutationType: housing.lastMutationType,
    lastMutationDate: housing.lastMutationDate,
    lastTransactionDate: housing.lastTransactionDate,
    lastTransactionValue: housing.lastTransactionValue,
    plotId: housing.plotId,
    plotArea: housing.plotArea
  };
}

interface FromDatafoncierHousingOptions {
  dataYears: number;
  dataFileYears: DataFileYear;
  source: HousingSource;
}

export function fromDatafoncierHousing(
  housing: DatafoncierHousing,
  options: FromDatafoncierHousingOptions
): HousingRecordApi {
  const streetNumber = housing.dnvoiri.replace(/^0+/, '') ?? '';
  const repetition = housing.dindic ?? '';
  const street = housing.dvoilib.trim();
  const geoCode = housing.idcom;
  const commune = housing.idcomtxt.trim();
  const jannath: number | null = !!housing.jannath ? Number(housing.jannath) : null;

  const [longitude, latitude] = housing.geomloc
    ? housing.geomloc.coordinates
    : [null, null];

  return {
    id: uuidv4(),
    invariant: housing.invar,
    localId: housing.idlocal,
    rawAddress: [
      `${streetNumber}${repetition} ${street}`,
      `${geoCode} ${commune}`
    ],
    geoCode,
    uncomfortable: false,
    housingKind:
      housing.dteloctxt === 'MAISON'
        ? HousingKind.HOUSE
        : HousingKind.APARTMENT,
    roomsCount: housing.npiece_p2,
    livingArea: housing.stoth,
    buildingYear: jannath,
    taxed: null,
    dataYears: [options.dataYears],
    dataFileYears: [options.dataFileYears],
    buildingLocation: `${housing.dnubat}${housing.descc}${housing.dniv}${housing.dpor}`,
    ownershipKind: housing.ctpdl as OwnershipKindInternal,
    status: HousingStatus.NEVER_CONTACTED,
    subStatus: null,
    actualEnergyConsumption: null,
    occupancy: toOccupancy(housing.ccthp),
    occupancyRegistered: toOccupancy(housing.ccthp),
    occupancyIntended: null,
    source: options.source,
    energyConsumption: null,
    energyConsumptionAt: null,
    beneficiaryCount: housing.ndroit,
    cadastralClassification: null,
    lastMutationType: null,
    lastMutationDate: `${housing.jdatatv.slice(-4)}-${housing.jdatatv.substring(2, 4)}-${housing.jdatatv.substring(0, 2)}`,
    lastTransactionDate: null,
    lastTransactionValue: null,
    buildingGroupId: null,
    buildingId: housing.idbat,
    plotId: housing.idpar,
    plotArea: null,
    geolocation: housing.geomloc,
    latitude,
    longitude,
    cadastralReference: housing.idsec,
    campaignIds: null,
    rentalValue: housing.dvltrt,
    vacancyStartYear: null
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

export function isContacted(housing: HousingApi): boolean {
  return (
    housing.status !== HousingStatus.NEVER_CONTACTED && hasCampaigns(housing)
  );
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

export function normalizeDataFileYears(
  dataFileYears: DataFileYear[]
): DataFileYear[] {
  return pipe(dataFileYears, Array.sort(Order.string), Array.dedupeAdjacent);
}

export function shouldReset(housing: HousingApi): boolean {
  return (
    housing.status === HousingStatus.WAITING &&
    housing.campaignIds?.length === 1
  );
}

export const diffHousingStatusUpdated = diff({
  status: Equivalence.strict<string | undefined>(),
  subStatus: Equivalence.strict<string | null | undefined>()
});

export const diffHousingOccupancyUpdated = diff({
  occupancy: Equivalence.strict<string | undefined>(),
  occupancyIntended: Equivalence.strict<string | null | undefined>()
});
