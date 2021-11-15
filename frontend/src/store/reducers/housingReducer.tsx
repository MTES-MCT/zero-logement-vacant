import { Housing } from '../../models/Housing';
import { FETCH_HOUSING_LIST, HOUSING_LIST_FETCHED, HousingActionTypes } from '../actions/housingAction';
import { HousingFilters } from '../../models/HousingFilters';


export interface HousingState {
    housingList: Housing[];
    filters: HousingFilters;
    search: string;
}

export const initialFilters = {
    ownerKinds: [],
    ownerAges: [],
    multiOwners: [],
    beneficiaryCounts: [],
    contactsCounts: [],
    housingKinds: [],
    housingStates: [],
    housingAreas: [],
    constructionPeriods: [],
    vacancyDurations: []
} as HousingFilters;

const initialState = {
    housingList: [],
    filters: initialFilters,
    search: ''
};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING_LIST:
            return {
                ...state,
                housingList: undefined,
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
