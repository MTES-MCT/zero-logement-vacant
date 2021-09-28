import { Dispatch } from 'redux';
import { Housing, HousingFilters } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';

export const FETCH_HOUSING = 'FETCH_HOUSING';
export const HOUSING_FETCHED = 'HOUSING_FETCHED';

export interface FetchHousingAction {
    type: typeof FETCH_HOUSING,
    filters: HousingFilters[]
}

export interface HousingFetchedAction {
    type: typeof HOUSING_FETCHED,
    housingList: Housing[],
    filters: HousingFilters[]
}

export type HousingActionTypes = FetchHousingAction | HousingFetchedAction;

export const listHousing = (filters?: HousingFilters[]) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING,
            filters
        });

        housingService.listHousing(filters)
            .then(housingList => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_FETCHED,
                    housingList,
                    filters
                });
            });
    };
};
