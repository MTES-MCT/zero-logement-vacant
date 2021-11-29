import { Dispatch } from 'redux';
import { Housing } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';

export const FETCH_HOUSING_LIST = 'FETCH_HOUSING_LIST';
export const HOUSING_LIST_FETCHED = 'HOUSING_LIST_FETCHED';

export interface FetchHousingListAction {
    type: typeof FETCH_HOUSING_LIST,
    filters: HousingFilters,
    page: number,
    perPage: number
}

export interface HousingListFetchedAction {
    type: typeof HOUSING_LIST_FETCHED,
    paginatedHousing: PaginatedResult<Housing>,
    filters: HousingFilters
}

export type HousingActionTypes = FetchHousingListAction | HousingListFetchedAction;

export const changeHousingFiltering = (filters: HousingFilters) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const page = 1
        const perPage = getState().housing.paginatedHousing.perPage

        dispatch({
            type: FETCH_HOUSING_LIST,
            page,
            perPage,
            filters
        });

        housingService.listHousing(filters, page, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_LIST_FETCHED,
                    paginatedHousing: result,
                    filters
                });
            });
    };
};

export const changeHousingPagination = (page: number, perPage: number) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const filters = getState().housing.filters

        dispatch({
            type: FETCH_HOUSING_LIST,
            page: page,
            perPage,
            filters
        });

        housingService.listHousing(getState().housing.filters, page, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_LIST_FETCHED,
                    paginatedHousing: result,
                    filters
                });
            });
    };
};
