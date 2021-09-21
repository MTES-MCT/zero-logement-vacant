import { Housing } from '../../models/Housing';
import { FETCH_HOUSING, HousingActionTypes } from '../actions/housingAction';


export interface HousingState {
    housingList: Housing[];
}

const initialState = { housingList: []};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING:
            return {
                ...state,
                housingList: action.housingList
            };
        default:
            return state;
    }
};

export default housingReducer;
