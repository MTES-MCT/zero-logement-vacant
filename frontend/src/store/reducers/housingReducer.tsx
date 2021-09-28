import { Housing, HousingFilters } from '../../models/Housing';
import { FETCH_HOUSING, HOUSING_FETCHED, HousingActionTypes } from '../actions/housingAction';


export interface HousingState {
    housingList: Housing[];
    housingFilters: HousingFilters[];
}

const initialState = { housingList: [], filters: []};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING:
            return {
                ...state,
                housingList: [],
                filters: action.filters
            };
        case HOUSING_FETCHED:
            return {
                ...state,
                housingList: action.filters === state.filters ? action.housingList : state.housingList
            };
        default:
            return state;
    }
};

export default housingReducer;
