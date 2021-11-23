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
    currentPage: number,
    perPage: number
}

export interface HousingListFetchedAction {
    type: typeof HOUSING_LIST_FETCHED,
    housingList: Housing[],
    totalCount: number,
    filters: HousingFilters
    currentPage: number,
    perPage: number
}

export type HousingActionTypes = FetchHousingListAction | HousingListFetchedAction;

export const filterHousing = (filters: HousingFilters) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const currentPage = getState().housing.currentPage
        const perPage = getState().housing.perPage

        dispatch({
            type: FETCH_HOUSING_LIST,
            currentPage,
            perPage,
            filters
        });

        housingService.listHousing(filters, currentPage, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_LIST_FETCHED,
                    housingList: result.entities,
                    totalCount: result.totalCount,
                    currentPage,
                    perPage,
                    filters
                });
            });
    };
};

export const changePagination = (page: number, perPage: number) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const filters = getState().housing.filters

        dispatch({
            type: FETCH_HOUSING_LIST,
            currentPage: page,
            perPage,
            filters
        });

        housingService.listHousing(getState().housing.filters, page, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_LIST_FETCHED,
                    housingList: result.entities,
                    totalCount: result.totalCount,
                    currentPage: page,
                    perPage,
                    filters
                });
            });
    };
};
