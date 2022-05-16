import { HousingScopesApi } from './EstablishmentApi';

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
    ownershipKinds?: string[];
    housingCounts?: string[];
    vacancyRates?: string[];
    campaignsCounts?: string[];
    campaignIds?: string[];
    ownerIds?: string[];
    localities?: string[];
    localityKinds?: string[];
    housingScopes?: HousingScopesApi;
    dataYearsIncluded?: number[];
    dataYearsExcluded?: number[];
    status?: number[];
    query?: string;
}
