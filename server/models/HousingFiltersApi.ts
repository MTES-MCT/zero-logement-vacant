import { OccupancyKindApi, OwnershipKindsApi } from './HousingApi';

export interface HousingFiltersApi {
  establishmentIds?: string[];
  ownerKinds?: string[];
  ownerAges?: string[];
  multiOwners?: string[];
  beneficiaryCounts?: string[];
  housingKinds?: string[];
  cadastralClassifications?: string[];
  housingAreas?: string[];
  roomsCounts?: string[];
  buildingPeriods?: string[];
  vacancyDurations?: string[];
  isTaxedValues?: string[];
  ownershipKinds?: OwnershipKindsApi[];
  housingCounts?: string[];
  vacancyRates?: string[];
  campaignsCounts?: string[];
  campaignIds?: string[];
  ownerIds?: string[];
  localities?: string[];
  localityKinds?: string[];
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  dataYearsIncluded?: number[];
  dataYearsExcluded?: number[];
  status?: number[];
  subStatus?: string[];
  query?: string;
  occupancy?: OccupancyKindApi;
}

export type HousingFiltersForTotalCountApi = Pick<
  HousingFiltersApi,
  | 'establishmentIds'
  | 'dataYearsIncluded'
  | 'dataYearsExcluded'
  | 'status'
  | 'campaignIds'
>;
