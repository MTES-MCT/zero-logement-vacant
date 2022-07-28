import { EstablishmentData } from '../../models/Establishment';
import {
    ESTABLISHMENT_DATA_FETCHED,
    FETCH_HOUSING_BY_STATUS_COUNT,
    FETCH_HOUSING_BY_STATUS_DURATION,
    FETCH_HOUSING_TO_CONTACT,
    FETCHING_ESTABLISHMENT_DATA,
    HOUSING_BY_STATUS_COUNT_FETCHED,
    HOUSING_BY_STATUS_DURATION_FETCHED,
    HOUSING_TO_CONTACT_FETCHED,
    MonitoringActionTypes,
} from '../actions/monitoringAction';
import { HousingStatusCount, HousingStatusDuration } from '../../models/HousingState';
import { MonitoringFilters } from '../../models/MonitoringFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';
import config from '../../utils/config';


export interface MonitoringState {
    housingByStatusCount?: HousingStatusCount[];
    housingByStatusDuration?: HousingStatusDuration[];
    paginatedHousingToContact: PaginatedResult<Housing>;
    establishmentData?: EstablishmentData[];
    housingByStatusCountFilters: MonitoringFilters;
    housingByStatusDurationFilters: MonitoringFilters;
    establishmentDataFilters: MonitoringFilters;
    paginatedHousingToContactFilters: MonitoringFilters;
}

export const initialMonitoringFilters = {
    establishmentIds: [],
    dataYears: [2022]
} as MonitoringFilters;

const initialState: MonitoringState = {
    paginatedHousingToContact: {
        entities: [],
        page: 1,
        perPage: config.perPageDefault,
        totalCount: 0,
        loading: true
    },
    housingByStatusCountFilters: initialMonitoringFilters,
    housingByStatusDurationFilters: initialMonitoringFilters,
    establishmentDataFilters: initialMonitoringFilters,
    paginatedHousingToContactFilters: initialMonitoringFilters
};

const monitoringReducer = (state = initialState, action: MonitoringActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING_BY_STATUS_COUNT:
            return {
                ...state,
                housingByStatusCountFilters: action.filters
            };
        case HOUSING_BY_STATUS_COUNT_FETCHED: {
            const isCurrentFetching = action.filters === state.housingByStatusCountFilters;
            return !isCurrentFetching ? state : {
                ...state,
                housingByStatusCount: action.housingByStatusCount
            };
        }
        case FETCH_HOUSING_BY_STATUS_DURATION:
            return {
                ...state,
                housingByStatusDurationFilters: action.filters
            };
        case HOUSING_BY_STATUS_DURATION_FETCHED: {
            const isCurrentFetching = action.filters === state.housingByStatusDurationFilters;
            return !isCurrentFetching ? state : {
                ...state,
                housingByStatusDuration: action.housingByStatusDuration
            };
        }
        case FETCH_HOUSING_TO_CONTACT:
            return {
                ...state,
                paginatedHousingToContact: {
                    entities: [],
                    totalCount: 0,
                    page: action.page,
                    perPage: action.perPage,
                    loading: true
                },
                paginatedHousingToContactFilters: action.filters
            };
        case HOUSING_TO_CONTACT_FETCHED: {
            const isCurrentFetching =
                action.filters === state.paginatedHousingToContactFilters &&
                action.paginatedHousing.page === state.paginatedHousingToContact?.page &&
                action.paginatedHousing.perPage === state.paginatedHousingToContact?.perPage
            return !isCurrentFetching ? state : {
                ...state,
                paginatedHousingToContact: {
                    ...state.paginatedHousingToContact,
                    entities: action.paginatedHousing.entities,
                    totalCount: action.paginatedHousing.totalCount,
                    loading: false
                }
            };
        }
        case FETCHING_ESTABLISHMENT_DATA:
            return {
                ...state,
                establishmentDataFilters: action.filters
            };
        case ESTABLISHMENT_DATA_FETCHED: {
            const isCurrentFetching = action.filters === state.establishmentDataFilters;
            return !isCurrentFetching ? state : {
                ...state,
                establishmentData: action.establishmentData
            };
        }
        default:
            return state;
    }
};

export default monitoringReducer;
