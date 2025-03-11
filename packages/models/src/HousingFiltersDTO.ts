import { BeneficiaryCount } from './BeneficiaryCount';
import { BuildingPeriod } from './BuildingPeriod';
import { CadastralClassification } from './CadastralClassification';
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
  energyConsumption?: (EnergyConsumption | null)[];
  establishmentIds?: string[];
  groupIds?: string[];
  campaignsCounts?: CampaignCount[];
  campaignIds?: Array<string | null>;
  ownerIds?: string[];
  ownerKinds?: Array<OwnerKind | null>;
  ownerAges?: OwnerAge[];
  multiOwners?: boolean[];
  beneficiaryCounts?: BeneficiaryCount[];
  housingKinds?: HousingKind[];
  housingAreas?: LivingArea[];
  roomsCounts?: RoomCount[];
  cadastralClassifications?: Array<CadastralClassification | null>;
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
  localityKinds?: Array<LocalityKind | null>;
  geoPerimetersIncluded?: string[];
  geoPerimetersExcluded?: string[];
  dataFileYearsIncluded?: Array<DataFileYear | null>;
  dataFileYearsExcluded?: Array<DataFileYear | null>;
  status?: HousingStatus;
  statusList?: HousingStatus[];
  subStatus?: string[];
  query?: string;
  precisions?: Array<Precision['id']>;
}
