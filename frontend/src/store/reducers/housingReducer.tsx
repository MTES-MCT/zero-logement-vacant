import { Housing } from '../../models/Housing';
import { FETCH_HOUSING_LIST, HOUSING_LIST_FETCHED, HousingActionTypes } from '../actions/housingAction';
import { HousingFilters } from '../../models/HousingFilters';


export interface HousingState {
    housingList: Housing[];
    totalCount: number;
    currentPage: number;
    perPage: number;
    filters: HousingFilters;
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
    buildingPeriods: [],
    vacancyDurations: [],
    isTaxedValues: [],
    query: ''
} as HousingFilters;

const initialState = {
    housingList: [],
    filters: initialFilters,
    currentPage: 1,
    perPage: 20,
    totalCount: 0
};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING_LIST:
            return {
                ...state,
                housingList: undefined,
                totalCount: 0,
                currentPage: action.currentPage,
                perPage: action.perPage,
                filters: action.filters
            };
        case HOUSING_LIST_FETCHED: {
            const isCurrentFetching = action.filters === state.filters && action.currentPage === state.currentPage && action.perPage === state.perPage
            return !isCurrentFetching ? state : {
                ...state,
                housingList: action.housingList,
                totalCount: action.totalCount
            };
        }
        default:
            return state;
    }
};

export default housingReducer;
