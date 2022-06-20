import { HousingScopesApi } from './EstablishmentApi';
import { OwnershipKindsApi } from './HousingApi';

export interface HousingFiltersApi {
    establishmentIds?: string[]
    ownerKinds?: string[];
    ownerAges?: string[];
    multiOwners?: string[];
    beneficiaryCounts?: string[];
    housingKinds?: string[];
    housingStates?: string[];
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
    housingScopesIncluded?: HousingScopesApi;
    housingScopesExcluded?: HousingScopesApi;
    dataYearsIncluded?: number[];
    dataYearsExcluded?: number[];
    status?: number[];
    query?: string;
}
