import { Owner } from './Owner';
import { HousingStatus } from './HousingState';
import { stringSort } from '../utils/stringUtils';
import { Compare } from '../utils/compareUtils';
import { Sort } from './Sort';
import { LocalityKinds } from './Locality';

export interface Housing {
  id: string;
  invariant: string;
  cadastralReference: string;
  buildingLocation?: string;
  rawAddress: string[];
  latitude?: number;
  longitude?: number;
  localityKind: LocalityKinds;
  geoPerimeters?: string[];
  owner: Owner;
  livingArea: number;
  housingKind: string;
  roomsCount: number;
  buildingYear?: number;
  vacancyStartYear: number;
  vacancyReasons: string[];
  uncomfortable: boolean;
  cadastralClassification: number;
  taxed: boolean;
  ownershipKind: OwnershipKinds;
  buildingHousingCount?: number;
  buildingVacancyRate: number;
  dataYears: number[];
  campaignIds: string[];
  status?: HousingStatus;
  subStatus?: string;
  precisions?: string[];
  lastContact?: Date;
}

export interface SelectedHousing {
  all: boolean;
  ids: string[];
}

export interface HousingUpdate {
  status: HousingStatus;
  subStatus?: string;
  precisions?: string[];
  contactKind?: string;
  vacancyReasons?: string[];
  comment?: string;
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
        housing.buildingLocation.substr(5 + idx, 5).replace(/^0+/g, ''),
    } as BuildingLocation;
  }
};

export const selectedHousingCount = (
  selectedHousing: SelectedHousing,
  totalCount: number
) => {
  return selectedHousing.all
    ? totalCount - selectedHousing.ids.length
    : selectedHousing.ids.length;
};

export const housingSort = (h1: Housing, h2: Housing) =>
  Math.max(...h1.dataYears) === Math.max(...h2.dataYears)
    ? h1.invariant.localeCompare(h2.invariant)
    : Math.max(...h1.dataYears) - Math.max(...h2.dataYears);

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

export const hasGeoPerimeters = (housing: Housing) =>
  housing.geoPerimeters &&
  housing.geoPerimeters.filter((_) => _ !== null).length > 0;

export enum OwnershipKinds {
  Single = 'single',
  CoOwnership = 'co',
  Other = 'other',
}

export const OwnershipKindLabels = {
  [OwnershipKinds.Single]: 'Monopropriété',
  [OwnershipKinds.CoOwnership]: 'Copropriété',
  [OwnershipKinds.Other]: 'Autre',
};

export type HousingSortable = Pick<Housing, 'rawAddress' | 'owner'>;
export type HousingSort = Sort<HousingSortable>;
