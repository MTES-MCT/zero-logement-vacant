import { EstablishmentData } from '../../models/Establishment';
import {
    ESTABLISHMENT_DATA_FETCHED,
    FETCH_HOUSING_BY_STATUS_COUNT,
    FETCH_HOUSING_BY_STATUS_DURATION,
    FETCHING_ESTABLISHMENT_DATA,
    HOUSING_BY_STATUS_COUNT_FETCHED,
    HOUSING_BY_STATUS_DURATION_FETCHED,
    MonitoringActionTypes,
} from '../actions/monitoringAction';
import { HousingStatusCount, HousingStatusDuration } from '../../models/HousingState';
import { MonitoringFilters } from '../../models/MonitoringFilters';


export interface MonitoringState {
    housingByStatusCount?: HousingStatusCount[];
    housingByStatusDuration?: HousingStatusDuration[];
    establishmentData?: EstablishmentData[];
    housingByStatusCountFilters: MonitoringFilters;
    housingByStatusDurationFilters: MonitoringFilters;
    establishmentDataFilters: MonitoringFilters;
}

export const initialMonitoringFilters = {
    establishmentIds: [],
    dataYears: [2022]
} as MonitoringFilters;

const initialState: MonitoringState = {
    housingByStatusCountFilters: initialMonitoringFilters,
    housingByStatusDurationFilters: initialMonitoringFilters,
    establishmentDataFilters: initialMonitoringFilters
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
