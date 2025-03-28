import { BeneficiaryCount } from './BeneficiaryCount';
import { BuildingPeriod } from './BuildingPeriod';
import { CampaignCount } from './CampaignCount';
import { DataFileYear } from './DataFileYear';
import { EnergyConsumption } from './EnergyConsumption';
import { HousingByBuilding } from './HousingByBuilding';
import { HousingKind } from './HousingKind';
import { HousingStatus } from './HousingStatus';
import { LivingArea } from './LivingArea';
import { LocalityKind } from './LocalityDTO';
import { Occupancy } from './Occupancy';
import { OwnerAge } from './OwnerAge';
import { OwnerKind } from './OwnerKind';
import { OwnershipKind } from './OwnershipKind';
import { Precision } from './Precision';
import { RoomCount } from './RoomCount';
import { VacancyRate } from './VacancyRate';
import { VacancyYear } from './VacancyYear';

export interface HousingFiltersDTO {
  /**
   * If `true`, make `housingIds` exclusive. Otherwise, make it inclusive.
   */
  all?: boolean;
  housingIds?: string[];
  occupancies?: Occupancy[];
  energyConsumption?: EnergyConsumption[];
  establishmentIds?: string[];
  groupIds?: string[];
  campaignsCounts?: CampaignCount[];
  campaignIds?: Array<string | null>;
  ownerIds?: string[];
  ownerKinds?: OwnerKind[];
  ownerAges?: OwnerAge[];
  multiOwners?: boolean[];
  beneficiaryCounts?: BeneficiaryCount[];
  housingKinds?: HousingKind[];
  housingAreas?: LivingArea[];
  roomsCounts?: RoomCount[];
  cadastralClassifications?: number[];
  buildingPeriods?: BuildingPeriod[];
  vacancyYears?: VacancyYear[];
  // TODO: make it an exclusive boolean ?
  // TODO: rename to taxed
  isTaxedValues?: boolean[];
  ownershipKinds?: OwnershipKind[];
  housingCounts?: HousingByBuilding[];
  vacancyRates?: VacancyRate[];
  intercommunalities?: string[];
  localities?: string[];
  localityKinds?: LocalityKind[];
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  dataFileYearsIncluded?: DataFileYear[];
  dataFileYearsExcluded?: DataFileYear[];
  status?: HousingStatus;
  statusList?: HousingStatus[];
  subStatus?: string[];
  query?: string;
  precisions?: Array<Precision['id']>;
}
