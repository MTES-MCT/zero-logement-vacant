import { Housing } from '../../models/Housing';
import {
    ADDITIONAL_OWNER_CREATED,
    ADDITIONAL_OWNERS_FETCHED,
    FETCHING_ADDITIONAL_OWNERS,
    FETCHING_HOUSING,
    FETCHING_HOUSING_EVENTS,
    FETCHING_HOUSING_LIST,
    FETCHING_HOUSING_OWNERS,
    HOUSING_EVENTS_FETCHED,
    HOUSING_FETCHED,
    HOUSING_LIST_FETCHED,
    HOUSING_OWNERS_FETCHED,
    HOUSING_OWNERS_UPDATE,
    HousingActionTypes,
} from '../actions/housingAction';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import config from '../../utils/config';
import { HousingOwner, Owner } from '../../models/Owner';
import { Event } from '../../models/Event';
import { FormState } from '../actions/FormState';


export interface HousingState {
    paginatedHousing: PaginatedResult<Housing>;
    filters: HousingFilters;
    housing?: Housing;
    housingOwners?: HousingOwner[];
    additionalOwners?: {
        paginatedOwners: PaginatedResult<Owner>;
        q: string
    };
    additionalOwner?: Owner;
    events?: Event[];
    checkedHousingIds?: string[];
    housingOwnersUpdateFormState?: FormState;
}

export const initialHousingFilters = {
    ownerKinds: [],
    ownerAges: [],
    multiOwners: [],
    beneficiaryCounts: [],
    housingKinds: [],
    cadastralClassifications: [],
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
    geoPerimetersIncluded: [],
    geoPerimetersExcluded: [],
    dataYearsIncluded: [config.dataYear + 1],
    dataYearsExcluded: [],
    query: ''
} as HousingFilters;

const initialState: HousingState = {
    paginatedHousing: {
        entities: [],
        page: 1,
        perPage: config.perPageDefault,
        totalCount: 0,
        loading: true
    },
    filters: initialHousingFilters
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
                housingOwners: undefined
            };
        case HOUSING_OWNERS_FETCHED:
            return {
                ...state,
                housingOwners: action.housingOwners
            };
        case FETCHING_ADDITIONAL_OWNERS:
            return {
                ...state,
                additionalOwners: {
                    paginatedOwners: {
                        page: action.page,
                        perPage: action.perPage,
                        loading: true
                    },
                    q: action.q
                }
            };
        case ADDITIONAL_OWNERS_FETCHED: {
            const isCurrentFetching =
                action.q === state.additionalOwners?.q &&
                action.paginatedOwners.page === state.additionalOwners?.paginatedOwners.page &&
                action.paginatedOwners.perPage === state.additionalOwners.paginatedOwners.perPage
            return !isCurrentFetching ? state : {
                ...state,
                additionalOwners: {
                    ...state.additionalOwners,
                    paginatedOwners: {
                        ...state.additionalOwners?.paginatedOwners,
                        entities: action.paginatedOwners.entities,
                        totalCount: action.paginatedOwners.totalCount,
                        loading: false
                    }
                }
            };
        }
        case ADDITIONAL_OWNER_CREATED:
            return {
                ...state,
                additionalOwner: action.additionalOwner
            };
        case FETCHING_HOUSING_EVENTS:
            return {
                ...state,
                events: []
            };
        case HOUSING_OWNERS_UPDATE:
            return {
                ...state,
                housingOwnersUpdateFormState: action.formState
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
