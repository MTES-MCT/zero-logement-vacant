import { BeneficiaryCount } from './BeneficiaryCount';
import { BuildingPeriod } from './BuildingPeriod';
import { OwnershipKind } from './OwnershipKind';
import { OwnerAge } from './OwnerAge';
import { LivingArea } from './LivingArea';
import { HousingByBuilding } from './HousingByBuilding';
import { VacancyRate } from './VacancyRate';
import { Occupancy } from './Occupancy';
import { HousingStatus } from './HousingStatus';
import { EnergyConsumption } from './EnergyConsumption';
import { HousingKind } from './HousingKind';
import { CampaignCount } from './CampaignCount';
import { RoomCount } from './RoomCount';
import { LocalityKind } from './LocalityDTO';

export interface HousingFiltersDTO {
  housingIds?: string[];
  occupancies?: Occupancy[];
  energyConsumption?: EnergyConsumption[];
  establishmentIds?: string[];
  groupIds?: string[];
  campaignsCounts?: CampaignCount[];
  campaignIds?: string[];
  ownerIds?: string[];
  ownerKinds?: string[];
  ownerAges?: OwnerAge[];
  multiOwners?: boolean[];
  beneficiaryCounts?: BeneficiaryCount[];
  housingKinds?: HousingKind[];
  housingAreas?: LivingArea[];
  roomsCounts?: RoomCount[];
  cadastralClassifications?: string[];
  buildingPeriods?: BuildingPeriod[];
  vacancyDurations?: string[];
  // TODO: make it an exclusive boolean ?
  // TODO: rename to taxed
  isTaxedValues?: boolean[];
  ownershipKinds?: OwnershipKind[];
  housingCounts?: HousingByBuilding[];
  vacancyRates?: VacancyRate[];
  localities?: string[];
  localityKinds?: ReadonlyArray<LocalityKind | null>;
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  dataFileYearsIncluded?: string[];
  dataFileYearsExcluded?: string[];
  status?: HousingStatus;
  statusList?: HousingStatus[];
  subStatus?: string[];
  query?: string;
}
