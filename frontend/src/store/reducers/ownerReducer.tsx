import { Owner } from '../../models/Owner';
import { OWNER_FETCHED, OWNER_HOUSING_FETCHED, OwnerActionTypes } from '../actions/ownerAction';
import { HousingDetails } from '../../models/Housing';


export interface OwnerState {
    owner: Owner;
    housingList: HousingDetails[];
}

const initialState = { };

const ownerReducer = (state = initialState, action: OwnerActionTypes) => {
    switch (action.type) {
        case OWNER_FETCHED:
            return {
                ...state,
                owner: action.owner
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
