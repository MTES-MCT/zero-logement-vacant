import { Housing, HousingFilters } from '../../models/Housing';
import { FETCH_HOUSING, HOUSING_FETCHED, HousingActionTypes } from '../actions/housingAction';


export interface HousingState {
    housingList: Housing[];
    housingFilters: HousingFilters[];
    search: string;
}

const initialState = { housingList: [], filters: [], search: ''};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING:
            return {
                ...state,
                housingList: [],
                filters: action.filters,
                search: action.search
            };
        case HOUSING_FETCHED:
            return {
                ...state,
                housingList: (action.filters === state.filters && action.search === state.search) ? action.housingList : state.housingList
            };
        default:
            return state;
    }
};

export default housingReducer;
