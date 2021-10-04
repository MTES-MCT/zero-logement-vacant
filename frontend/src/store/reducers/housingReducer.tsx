import { Housing, HousingFilters } from '../../models/Housing';
import { FETCH_HOUSING_LIST, HOUSING_LIST_FETCHED, HousingActionTypes } from '../actions/housingAction';


export interface HousingState {
    housingList: Housing[];
    filters: HousingFilters;
    search: string;
}

const initialState = {
    housingList: [],
    filters: {
        individualOwner: false,
        ageGt75: false,
        multiOwner: false,
        beneficiaryGt2: false,
        ownerKind: '',
        ownerAge: '',
        beneficiaryCount: undefined,
        housingKind: '',
        housingState: ''
    },
    search: ''
};

const housingReducer = (state = initialState, action: HousingActionTypes) => {
    switch (action.type) {
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
