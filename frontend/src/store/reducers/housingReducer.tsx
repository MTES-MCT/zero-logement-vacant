import { Housing } from '../../models/Housing';
import { FETCH_HOUSING_LIST, HOUSING_LIST_FETCHED, HousingActionTypes } from '../actions/housingAction';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';


export interface HousingState {
    paginatedHousing: PaginatedResult<Housing>;
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
    query: '',
    excludedIds: []
} as HousingFilters;

const initialState = {
    paginatedHousing: {
        entities: [],
        page: 1,
        perPage: 20,
        totalCount: 0
    },
    filters: initialFilters,
    checkedHousingIds: []
};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
        case FETCH_HOUSING_LIST:
            return {
                ...state,
                paginatedHousing: {
                    entities: [],
                    totalCount: 0,
                    page: action.page,
                    perPage: action.perPage
                },
                filters: action.filters
            };
        case HOUSING_LIST_FETCHED: {
            const isCurrentFetching =
                action.filters === state.filters &&
                action.paginatedHousing.page === state.paginatedHousing.page &&
                action.paginatedHousing.perPage === state.paginatedHousing.perPage
            return !isCurrentFetching ? state : {
                ...state,
                paginatedHousing: {
                    ...state.paginatedHousing,
                    entities: action.paginatedHousing.entities,
                    totalCount: action.paginatedHousing.totalCount,
                },
            };
        }
        default:
            return state;
    }
};

export default housingReducer;
