import { Dispatch } from 'redux';
import { Housing, HousingFilters } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';
import { HousingDetail } from '../../models/HousingDetail';

export const HOUSING_DETAIL_FETCHED = 'HOUSING_DETAIL_FETCHED';
export const FETCH_HOUSING_LIST = 'FETCH_HOUSING_LIST';
export const HOUSING_LIST_FETCHED = 'HOUSING_LIST_FETCHED';

export interface HousingDetailFetchedAction {
    type: typeof HOUSING_DETAIL_FETCHED,
    housing: HousingDetail
}

export interface FetchHousingListAction {
    type: typeof FETCH_HOUSING_LIST,
    filters: HousingFilters,
    search: string
}

export interface HousingListFetchedAction {
    type: typeof HOUSING_LIST_FETCHED,
    housingList: Housing[],
    filters: HousingFilters,
    search: string
}

export type HousingActionTypes = HousingDetailFetchedAction | FetchHousingListAction | HousingListFetchedAction;

export const getHousing = (id: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        housingService.getHousing(id)
            .then(housing => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_DETAIL_FETCHED,
                    housing
                });
            });
    };
};

export const filterHousing = (filters: HousingFilters) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING_LIST,
            filters,
            search: getState().housing.search
        });

        housingService.listHousing(filters, getState().housing.search)
            .then(housingList => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_LIST_FETCHED,
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
            type: FETCH_HOUSING_LIST,
            filters: getState().housing.filters,
            search
        });

        housingService.listHousing(getState().housing.filters, search)
            .then(housingList => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_LIST_FETCHED,
                    housingList,
                    filters: getState().housing.filters,
                    search
                });
            });
    };
};
