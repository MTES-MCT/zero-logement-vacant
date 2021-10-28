import { Owner } from '../../models/Owner';
import {
    FETCHING_OWNER, FETCHING_OWNER_EVENTS,
    FETCHING_OWNER_HOUSING, OWNER_EVENTS_FETCHED,
    OWNER_FETCHED,
    OWNER_HOUSING_FETCHED,
    OWNER_UPDATED,
    OwnerActionTypes,
} from '../actions/ownerAction';
import { HousingDetails } from '../../models/Housing';
import { OwnerEvent } from '../../models/OwnerEvent';


export interface OwnerState {
    owner: Owner;
    housingList: HousingDetails[];
    events: OwnerEvent[];
}

const initialState = { };

const ownerReducer = (state = initialState, action: OwnerActionTypes) => {
    switch (action.type) {
        case FETCHING_OWNER:
            return {
                ...state,
                owner: undefined
            };
        case OWNER_FETCHED:
            return {
                ...state,
                owner: action.owner
            };
        case FETCHING_OWNER_HOUSING:
            return {
                ...state,
                housingList: []
            };
        case OWNER_HOUSING_FETCHED:
            return {
                ...state,
                housingList: action.housingList
            };
        case OWNER_UPDATED:
            return {
                ...state,
                owner: action.owner
            };
        case FETCHING_OWNER_EVENTS:
            return {
                ...state,
                events: []
            };
        case OWNER_EVENTS_FETCHED:
            return {
                ...state,
                events: action.events
            };
        default:
            return state;
    }
};

export default ownerReducer;
