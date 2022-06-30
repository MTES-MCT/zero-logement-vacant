import { EstablishmentData } from '../../models/Establishment';
import {
    ESTABLISHMENT_DATA_FETCHED,
    FETCH_HOUSING_BY_STATUS_COUNT,
    FETCH_HOUSING_WAITING_FOR_3_MONTHS_COUNT,
    FETCHING_ESTABLISHMENT_DATA,
    HOUSING_BY_STATUS_COUNT_FETCHED,
    HOUSING_WAITING_FOR_3_MONTHS_COUNT_FETCHED,
    MonitoringActionTypes,
} from '../actions/monitoringAction';
import { HousingStatusCount } from '../../models/HousingState';
import { MonitoringFilters } from '../../models/MonitoringFilters';


export interface MonitoringState {
    housingByStatus?: HousingStatusCount[];
    housingWaitingFor3MonthsCount?: number;
    establishmentData?: EstablishmentData[];
    housingByStatusFilters: MonitoringFilters;
    housingWaitingFor3MonthsFilters: MonitoringFilters;
    establishmentDataFilters: MonitoringFilters;
}

export const initialMonitoringFilters = {
    establishmentIds: [],
    dataYears: [2022]
} as MonitoringFilters;

const initialState: MonitoringState = {
    housingByStatusFilters: initialMonitoringFilters,
    housingWaitingFor3MonthsFilters: initialMonitoringFilters,
    establishmentDataFilters: initialMonitoringFilters
};

const monitoringReducer = (state = initialState, action: MonitoringActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING_BY_STATUS_COUNT:
            return {
                ...state,
                housingByStatusFilters: action.filters
            };
        case HOUSING_BY_STATUS_COUNT_FETCHED: {
            const isCurrentFetching = action.filters === state.housingByStatusFilters;
            return !isCurrentFetching ? state : {
                ...state,
                housingByStatus: action.housingByStatus
            };
        }
        case FETCH_HOUSING_WAITING_FOR_3_MONTHS_COUNT:
            return {
                ...state,
                housingWaitingFor3MonthsFilters: action.filters
            };
        case HOUSING_WAITING_FOR_3_MONTHS_COUNT_FETCHED: {
            const isCurrentFetching = action.filters === state.housingWaitingFor3MonthsFilters;
            return !isCurrentFetching ? state : {
                ...state,
                housingWaitingFor3MonthsCount: action.count
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
