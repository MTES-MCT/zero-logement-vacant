import {
  HousingFiltersDTO,
  Occupancy,
  OwnershipKind
} from '@zerologementvacant/models';

export interface HousingFiltersApi extends Pick<
  HousingFiltersDTO,
  | 'all'
  | 'intercommunalities'
  | 'precisions'
  | 'dataFileYearsIncluded'
  | 'dataFileYearsExcluded'
  | 'energyConsumption'
  | 'ownerKinds'
  | 'ownerAges'
  | 'relativeLocations'
  | 'localityKinds'
  | 'cadastralClassifications'
  | 'lastMutationYears'
  | 'lastMutationTypes'
  | 'vacancyYears'
> {
  housingIds?: string[];
  establishmentIds?: string[];
  groupIds?: string[];
  multiOwners?: boolean[];
  /**
   * The secondary owners
   * @todo Rename this to secondaryOwners
   */
  beneficiaryCounts?: string[];
  housingKinds?: string[];
  housingAreas?: string[];
  roomsCounts?: string[];
  buildingPeriods?: string[];
  isTaxedValues?: boolean[];
  ownershipKinds?: OwnershipKind[];
  housingCounts?: string[];
  // TODO: type there based on housing repository values
  vacancyRates?: string[];
  campaignCount?: number;
  campaignIds?: Array<string | null>;
  ownerIds?: string[];
  departments?: string[];
  localities?: string[];
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  status?: number;
  statusList?: number[];
  subStatus?: string[];
  query?: string;
  occupancies?: Occupancy[];
}

