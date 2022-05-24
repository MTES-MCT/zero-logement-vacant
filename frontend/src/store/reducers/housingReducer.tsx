import { Housing } from '../../models/Housing';
import {
    FETCHING_HOUSING,
    FETCHING_HOUSING_EVENTS,
    FETCHING_HOUSING_LIST,
    FETCHING_HOUSING_OWNERS,
    HOUSING_EVENTS_FETCHED,
    HOUSING_FETCHED,
    HOUSING_LIST_FETCHED,
    HOUSING_OWNERS_FETCHED,
    HousingActionTypes,
} from '../actions/housingAction';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import config from '../../utils/config';
import { Owner } from '../../models/Owner';
import { OwnerEvent } from '../../models/OwnerEvent';


export interface HousingState {
    paginatedHousing: PaginatedResult<Housing>;
    filters: HousingFilters;
    housing: Housing;
    owners: Owner[];
    events: OwnerEvent[];
}

export const initialHousingFilters = {
    ownerKinds: [],
    ownerAges: [],
    multiOwners: [],
    beneficiaryCounts: [],
    housingKinds: [],
    housingStates: [],
    housingAreas: [],
    roomsCounts: [],
    buildingPeriods: [],
    vacancyDurations: [],
    isTaxedValues: [],
    ownershipKinds: [],
    housingCounts: [],
    vacancyRates: [],
    campaignsCounts: [],
    campaignIds: [],
    localities: [],
    localityKinds: [],
    housingScopesIncluded: {geom: true, scopes: []},
    housingScopesExcluded: {geom: true, scopes: []},
    dataYearsIncluded: [config.dataYear + 1],
    dataYearsExcluded: [],
    query: ''
} as HousingFilters;

const initialState = {
    paginatedHousing: {
        entities: [],
        page: 1,
        perPage: config.perPageDefault,
        totalCount: 0,
        loading: true
    },
    filters: initialHousingFilters,
    checkedHousingIds: []
};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case FETCHING_HOUSING:
            return {
                ...state,
                housing: undefined
            };
        case HOUSING_FETCHED:
            return {
                ...state,
                housing: action.housing
            };
        case FETCHING_HOUSING_OWNERS:
            return {
                ...state,
                owners: []
            };
        case HOUSING_OWNERS_FETCHED:
            return {
                ...state,
                owners: action.owners
            };
        case FETCHING_HOUSING_EVENTS:
            return {
                ...state,
                events: []
            };
        case HOUSING_EVENTS_FETCHED:
            return {
                ...state,
                events: action.events
            };
        case FETCHING_HOUSING_LIST:
            return {
                ...state,
                paginatedHousing: {
                    entities: [],
                    totalCount: 0,
                    page: action.page,
                    perPage: action.perPage,
                    loading: true
                },
                filters: action.filters
            };
        case HOUSING_LIST_FETCHED: {
            const isCurrentFetching =
                action.filters === state.filters &&
                action.paginatedHousing.page === state.paginatedHousing.page &&
                action.paginatedHousing.perPage === state.paginatedHousing.perPage
            return !isCurrentFetching ? state : {
                ...state,
                paginatedHousing: {
                    ...state.paginatedHousing,
                    entities: action.paginatedHousing.entities,
                    totalCount: action.paginatedHousing.totalCount,
                    loading: false
                }
            };
        }
        default:
            return state;
    }
};

export default housingReducer;
