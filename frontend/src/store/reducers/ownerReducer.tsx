import { Owner } from '../../models/Owner';
import {
    FETCHING_OWNER,
    FETCHING_OWNER_HOUSING,
    OWNER_FETCHED,
    OWNER_HOUSING_FETCHED,
    OwnerActionTypes,
} from '../actions/ownerAction';
import { HousingDetails } from '../../models/Housing';


export interface OwnerState {
    owner: Owner;
    housingList: HousingDetails[];
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
        default:
            return state;
    }
};

export default ownerReducer;
