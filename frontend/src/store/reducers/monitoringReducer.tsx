import { EstablishmentData } from '../../models/Establishment';
import {
    ESTABLISHMENT_DATA_FETCHED,
    FETCHING_ESTABLISHMENT_DATA,
    MonitoringActionTypes,
} from '../actions/monitoringAction';


export interface MonitoringState {
    establishmentData?: EstablishmentData[];
}

const initialState: MonitoringState = {
};

const monitoringReducer = (state = initialState, action: MonitoringActionTypes) => {
    switch (action.type) {
        case FETCHING_ESTABLISHMENT_DATA:
            return {
                ...state,
                establishmentData: undefined
            };
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
