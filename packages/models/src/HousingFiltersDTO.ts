import { BeneficiaryCount } from './BeneficiaryCount';
import { BuildingPeriod } from './BuildingPeriods';
import { OwnershipKind } from './OwnershipKind';

export interface HousingFiltersDTO {
  housingIds?: string[];
  establishmentIds?: string[];
  groupIds?: string[];
  ownerKinds?: string[];
  ownerAges?: string[];
  multiOwners?: string[];
  beneficiaryCounts?: BeneficiaryCount[];
  housingKinds?: string[];
  cadastralClassifications?: string[];
  housingAreas?: string[];
  roomsCounts?: string[];
  buildingPeriods?: BuildingPeriod[];
  vacancyDurations?: string[];
  isTaxedValues?: string[];
  ownershipKinds?: OwnershipKind[];
  housingCounts?: string[];
  vacancyRates?: string[];
  campaignsCounts?: string[];
  campaignIds?: string[];
  ownerIds?: string[];
  localities?: string[];
  localityKinds?: string[];
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  dataFileYearsIncluded?: string[];
  dataFileYearsExcluded?: string[];
  status?: number;
  statusList?: number[];
  subStatus?: string[];
  query?: string;
  energyConsumption?: string[];
  occupancies?: string[];
}
