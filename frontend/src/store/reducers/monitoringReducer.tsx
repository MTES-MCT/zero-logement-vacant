import { EstablishmentData } from '../../models/Establishment';
import {
    ESTABLISHMENT_DATA_FETCHED,
    FETCH_HOUSING_BY_STATUS_COUNT,
    HOUSING_BY_STATUS_COUNT_FETCHED,
    MonitoringActionTypes,
} from '../actions/monitoringAction';
import { HousingStatusCount } from '../../models/HousingState';


export interface MonitoringState {
    housingByStatus?: HousingStatusCount[];
    establishmentData?: EstablishmentData[];
}

const initialState: MonitoringState = {
};

const monitoringReducer = (state = initialState, action: MonitoringActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING_BY_STATUS_COUNT:
            return {};
        case HOUSING_BY_STATUS_COUNT_FETCHED: {
            return {
                ...state,
                housingByStatus: action.housingByStatus
            };
        }
        case ESTABLISHMENT_DATA_FETCHED:
            return {
                ...state,
                establishmentData: action.establishmentData
            };
        default:
            return state;
    }
};

export default monitoringReducer;
