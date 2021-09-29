import { Dispatch } from 'redux';
import { Housing, HousingFilters } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';

export const FETCH_HOUSING = 'FETCH_HOUSING';
export const HOUSING_FETCHED = 'HOUSING_FETCHED';

export interface FetchHousingAction {
    type: typeof FETCH_HOUSING,
    filters: HousingFilters,
    search: string
}

export interface HousingFetchedAction {
    type: typeof HOUSING_FETCHED,
    housingList: Housing[],
    filters: HousingFilters,
    search: string
}

export type HousingActionTypes = FetchHousingAction | HousingFetchedAction;

export const filterHousing = (filters: HousingFilters) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING,
            filters,
            search: getState().housing.search
        });

        housingService.listHousing(filters, getState().housing.search)
            .then(housingList => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_FETCHED,
                    housingList,
                    filters,
                    search: getState().housing.search
                });
            });
    };
};

export const searchHousing = (search: string) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING,
            filters: getState().housing.filters,
            search
        });

        housingService.listHousing(getState().housing.filters, search)
            .then(housingList => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_FETCHED,
                    housingList,
                    filters: getState().housing.filters,
                    search
                });
            });
    };
};
