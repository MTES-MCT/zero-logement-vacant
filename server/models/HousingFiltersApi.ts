import { HousingScopesApi } from './EstablishmentApi';

export interface HousingFiltersApi {
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
    campaignsCounts?: string[];
    campaignIds?: string[];
    ownerIds?: string[];
    localities?: string[];
    localityKinds?: string[];
    housingScopes?: HousingScopesApi;
    dataYears?: number[];
    query?: string;
}
