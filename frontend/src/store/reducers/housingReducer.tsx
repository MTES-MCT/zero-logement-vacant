import { Housing, HousingFilters } from '../../models/Housing';
import {
    HOUSING_DETAIL_FETCHED,
    FETCH_HOUSING_LIST,
    HOUSING_LIST_FETCHED,
    HousingActionTypes,
} from '../actions/housingAction';
import { HousingDetail } from '../../models/HousingDetail';


export interface HousingState {
    housingDetail: HousingDetail;
    housingList: Housing[];
    filters: HousingFilters;
    search: string;
}

const initialState = { housingList: [], filters: {}, search: ''};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case HOUSING_DETAIL_FETCHED:
            return {
                ...state,
                housingDetail: action.housing
            };
        case FETCH_HOUSING_LIST:
            return {
                ...state,
                housingList: [],
                filters: action.filters,
                search: action.search
            };
        case HOUSING_LIST_FETCHED:
            return {
                ...state,
                housingList: (action.filters === state.filters && action.search === state.search) ? action.housingList : state.housingList
            };
        default:
            return state;
    }
};

export default housingReducer;
