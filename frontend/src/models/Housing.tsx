import { Owner } from './Owner';
import { HousingStatus } from './HousingState';
import { stringSort } from '../utils/stringUtils';
import { Sort } from './Sort';
import { LocalityKinds } from './Locality';
import { Note } from './Note';
import { differenceInDays, format } from 'date-fns';
import { Compare } from '../utils/compareUtils';
import { HousingSource } from '../../../shared';

export interface Housing {
  id: string;
  invariant: string;
  cadastralReference: string;
  buildingLocation?: string;
  buildingGroupId?: string;
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
  status: HousingStatus;
  subStatus?: string;
  precisions?: string[];
  lastContact?: Date;
  energyConsumption?: string;
  energyConsumptionAt?: Date;
  occupancy?: OccupancyKind;
  occupancyIntended?: OccupancyKind;
  source: HousingSource | null;
}

export interface SelectedHousing {
  all: boolean;
  ids: string[];
}

export interface HousingUpdate {
  statusUpdate?: Pick<
    Housing,
    'status' | 'subStatus' | 'precisions' | 'vacancyReasons'
  >;
  occupancyUpdate?: Pick<Housing, 'occupancy' | 'occupancyIntended'>;
  note?: Pick<Note, 'content' | 'noteKind'>;
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

export const lastUpdate = (housing: Housing): String =>
  housing.lastContact
    ? `${format(housing.lastContact, 'dd/MM/yyyy')} (${differenceInDays(
        new Date(),
        housing.lastContact
      )} jours)`
    : 'Aucune mise à jour';

export enum OccupancyKind {
  Vacant = 'V',
  Rent = 'L',
  ShortRent = 'B',
  PrimaryResidence = 'P',
  SecondaryResidence = 'RS',
  CommercialOrOffice = 'T',
  Dependency = 'N',
  DemolishedOrDivided = 'D',
  Others = 'A',
}

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
};

export const OccupancyKindBadgeLabels = {
  ...OccupancyKindLabels,
  [OccupancyKind.Others]: 'Occupation : Autres',
};

export function getSource(housing: Housing): string {
  const year = housing.dataYears[0];
  const map: Record<HousingSource, string> = {
    lovac: `LOVAC ${year}`,
    'datafoncier-manual': `Fichiers Fonciers - import manuel (${year})`,
    'datafoncier-import': `Fichiers Fonciers - import automatique (${year})`,
  };
  return housing.source ? map[housing.source] : 'Inconnue';
}
