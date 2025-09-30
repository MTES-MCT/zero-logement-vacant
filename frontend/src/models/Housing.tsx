import {
  type EnergyConsumption,
  type HousingDTO,
  HousingKind,
  HousingStatus,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  Occupancy
} from '@zerologementvacant/models';
import { List } from 'immutable';
import { match, Pattern } from 'ts-pattern';

import { Compare } from '~/utils/compareUtils';
import { stringSort } from '~/utils/stringUtils';
import type { Note } from '~/models/Note';
import { type Owner, toOwnerDTO } from '~/models/Owner';
import type { Sort } from '~/models/Sort';

export interface Housing
  extends Pick<
    HousingDTO,
    | 'lastMutationType'
    | 'lastMutationDate'
    | 'lastTransactionDate'
    | 'lastTransactionValue'
    | 'id'
    | 'invariant'
    | 'localId'
    | 'geoCode'
    | 'rawAddress'
    | 'longitude'
    | 'latitude'
    | 'cadastralClassification'
    | 'cadastralReference'
    | 'uncomfortable'
    | 'livingArea'
    | 'housingKind'
    | 'roomsCount'
    | 'buildingYear'
    | 'taxed'
    | 'buildingLocation'
    | 'ownershipKind'
    | 'dataFileYears'
    | 'campaignIds'
    | 'status'
    | 'subStatus'
    | 'energyConsumption'
    | 'energyConsumptionAt'
    | 'occupancy'
    | 'occupancyIntended'
    | 'source'
    | 'vacancyStartYear'
  > {
  buildingId: string | null;
  buildingGroupId?: string;
  geoPerimeters?: string[];
  owner: Owner | null;
}

export interface SelectedHousing {
  all: boolean;
  ids: string[];
}

export interface HousingUpdate {
  statusUpdate?: Pick<Housing, 'status' | 'subStatus'>;
  occupancyUpdate?: Pick<Housing, 'occupancy' | 'occupancyIntended'>;
  note?: Pick<Note, 'content'>;
}

export interface BuildingLocation {
  building: string;
  entrance: string;
  level: string;
  local: string;
}

export const getBuildingLocation = (housing: Housing) => {
  const idx =
    housing.buildingLocation?.length === 11
      ? 1
      : housing.buildingLocation?.length === 10
        ? 0
        : undefined;
  if (
    idx !== undefined &&
    housing.buildingLocation &&
    housing.buildingLocation !== 'A010001001'
  ) {
    const level = housing.buildingLocation.substr(1 + idx, 2);
    return {
      building: 'Bâtiment ' + housing.buildingLocation.substr(0, 1 + idx),
      entrance:
        'Entrée ' +
        housing.buildingLocation.substr(1 + idx, 2).replace(/^0+/g, ''),
      level:
        level === '00'
          ? 'Rez-de-chaussée'
          : level === '01'
            ? '1er étage'
            : level.replace(/^0+/g, '') + 'ème étage',
      local:
        'Local ' +
        housing.buildingLocation.substr(5 + idx, 5).replace(/^0+/g, '')
    } as BuildingLocation;
  }
};

export function byAddress(h1: Housing, h2: Housing): Compare {
  const [house1, city1] = h1.rawAddress;
  const [hn1, ...s1] = house1.split(' ');
  const street1 = s1.join(' ');

  const [house2, city2] = h2.rawAddress;
  const [hn2, ...s2] = house2.split(' ');
  const street2 = s2.join(' ');

  const byCity = stringSort(city1, city2);
  const byStreet = stringSort(street1, street2);
  const byHouseNumber = stringSort(hn1, hn2);

  if (city1 === city2) {
    if (street1 === street2) {
      return byHouseNumber;
    }
    return byStreet;
  }
  return byCity;
}

export function formatOwnershipKind(kind: string | null): string {
  return match(kind)
    .with(
      Pattern.union(null, ...INTERNAL_MONO_CONDOMINIUM_VALUES),
      () => 'Monopropriété'
    )
    .with(Pattern.union(...INTERNAL_CO_CONDOMINIUM_VALUES), () => 'Copropriété')
    .otherwise(() => 'Autre');
}

export type HousingSortable = Pick<
  Housing,
  'rawAddress' | 'owner' | 'occupancy' | 'status'
>;
export type HousingSort = Sort<HousingSortable>;

export function toLink(housing: Housing): string {
  return `/logements/${housing.id}`;
}

const MIN_LNG = -180;
const MAX_LNG = 180;
const MIN_LAT = -90;
const MAX_LAT = 90;

export interface HousingWithCoordinates extends Housing {
  longitude: number;
  latitude: number;
}
export function hasCoordinates(
  housing: Housing
): housing is HousingWithCoordinates {
  return (
    !!housing.longitude &&
    !!housing.latitude &&
    MIN_LNG <= housing.longitude &&
    housing.longitude <= MAX_LNG &&
    MIN_LAT <= housing.latitude &&
    housing.latitude <= MAX_LAT
  );
}

/**
 * @deprecated The last update should not be retrieved from the housing
 * but from the events and notes instead.
 * @param housing
 */
export const lastUpdate = (): string | null => null;

export enum OccupancyKind {
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

export const OccupancyUnknown = 'inconnu';

export type OccupancyKindUnknown = typeof OccupancyUnknown;

/**
 * @deprecated See {@link OCCUPANCY_LABELS}
 */
export const OccupancyKindLabels = {
  [OccupancyKind.Vacant]: 'Vacant',
  [OccupancyKind.Rent]: 'En location',
  [OccupancyKind.ShortRent]: 'Meublé de tourisme',
  [OccupancyKind.PrimaryResidence]: 'Occupé par le propriétaire',
  [OccupancyKind.SecondaryResidence]: 'Résidence secondaire non louée',
  [OccupancyKind.CommercialOrOffice]: 'Local commercial ou bureau',
  [OccupancyKind.Dependency]: 'Dépendance',
  [OccupancyKind.DemolishedOrDivided]: 'Local démoli ou divisé',
  [OccupancyKind.Others]: 'Autres',
  [OccupancyUnknown]: 'Pas d’information'
};

export const OccupancyKindBadgeLabels = {
  ...OccupancyKindLabels,
  [OccupancyKind.Others]: 'Occupation : Autres'
};

export function getOccupancy(
  occupancy: Occupancy | null | undefined
): Occupancy {
  return occupancy ?? Occupancy.UNKNOWN;
}

export function getSource(
  housing: Pick<Housing, 'source' | 'dataFileYears'>
): string {
  const labels: Record<string, string> = {
    lovac: 'LOVAC',
    ff: 'Fichiers fonciers',
    'datafoncier-import': 'Fichiers fonciers',
    'datafoncier-manual': 'Fichiers fonciers'
  };

  const years = List(housing.dataFileYears)
    .groupBy((dataFileYear) => dataFileYear.split('-').at(0) as string)
    .map((dataFileYears) =>
      dataFileYears.map(
        (dataFileYear) => dataFileYear.split('-').at(1) as string
      )
    )
    .filter((years) => !years.isEmpty())
    .reduce((acc, years, source) => {
      const label = labels[source] ?? source;
      return acc.concat(`${label} (${years.join(', ')})`);
    }, List<string>());

  const source = housing.source ? labels[housing.source] : null;

  if (!years.isEmpty()) {
    return years.join(', ');
  }

  if (source) {
    return source;
  }

  return 'Inconnue';
}

export function toHousingDTO(housing: Housing): HousingDTO {
  return {
    id: housing.id,
    localId: housing.localId,
    invariant: housing.invariant,
    rawAddress: housing.rawAddress,
    geoCode: housing.geoCode,
    longitude: housing.longitude ?? null,
    latitude: housing.latitude ?? null,
    cadastralClassification: housing.cadastralClassification,
    uncomfortable: housing.uncomfortable,
    vacancyStartYear: housing.vacancyStartYear,
    housingKind: housing.housingKind as HousingKind,
    roomsCount: housing.roomsCount,
    livingArea: housing.livingArea,
    cadastralReference: housing.cadastralReference,
    buildingYear: housing.buildingYear ?? null,
    taxed: housing.taxed,
    dataYears: housing.dataFileYears
      .map((dataFileYear) => dataFileYear.split('-')[1])
      .map(Number),
    dataFileYears: housing.dataFileYears,
    buildingLocation: housing.buildingLocation ?? null,
    // TODO: fix this by making Housing extend HousingDTO
    ownershipKind: housing.ownershipKind,
    status: housing.status as unknown as HousingStatus,
    subStatus: housing.subStatus ?? null,
    energyConsumption:
      housing.energyConsumption as unknown as EnergyConsumption,
    energyConsumptionAt: housing.energyConsumptionAt,
    occupancy: housing.occupancy,
    occupancyIntended: housing.occupancyIntended,
    source: housing.source,
    owner: toOwnerDTO(housing.owner),
    lastMutationType: housing.lastMutationType,
    lastMutationDate: housing.lastMutationDate,
    lastTransactionDate: housing.lastTransactionDate,
    lastTransactionValue: housing.lastTransactionValue,
    beneficiaryCount: null,
    campaignIds: housing.campaignIds,
    rentalValue: null
  };
}