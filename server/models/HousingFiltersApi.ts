import { HousingScopesApi } from './EstablishmentApi';

export interface HousingFiltersApi {
    ownerKinds?: string[];
    ownerAges?: string[];
    multiOwners?: string[];
    beneficiaryCounts?: string[];
    contactsCounts?: string[];
    housingKinds?: string[];
    housingStates?: string[];
    housingAreas?: string[];
    buildingPeriods?: string[];
    vacancyDurations?: string[];
    isTaxedValues?: string[];
    campaignIds?: string[];
    ownerIds?: string[];
    localities?: string[];
    housingScopes?: HousingScopesApi;
    dataYears?: number[];
    query?: string;
}
