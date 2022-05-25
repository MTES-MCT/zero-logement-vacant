import { Dispatch } from 'redux';
import { Housing, HousingUpdate } from '../../models/Housing';
import housingService from '../../services/housing.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { ApplicationState } from '../reducers/applicationReducers';
import { HousingFilters } from '../../models/HousingFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Owner } from '../../models/Owner';
import ownerService from '../../services/owner.service';
import { OwnerEvent } from '../../models/OwnerEvent';
import eventService from '../../services/event.service';

export const FETCHING_HOUSING_LIST = 'FETCHING_HOUSING_LIST';
export const HOUSING_LIST_FETCHED = 'HOUSING_LIST_FETCHED';
export const FETCHING_HOUSING = 'FETCHING_HOUSING';
export const HOUSING_FETCHED = 'HOUSING_FETCHED';
export const FETCHING_HOUSING_OWNERS = 'FETCHING_HOUSING_OWNERS';
export const HOUSING_OWNERS_FETCHED = 'HOUSING_OWNERS_FETCHED';
export const FETCHING_HOUSING_EVENTS = 'FETCHING_HOUSING_OWNERS';
export const HOUSING_EVENTS_FETCHED = 'HOUSING_EVENTS_FETCHED';

export interface FetchingHousingAction {
    type: typeof FETCHING_HOUSING
}

export interface HousingFetchedAction {
    type: typeof HOUSING_FETCHED,
    housing: Housing
}

export interface FetchingHousingOwnersAction {
    type: typeof FETCHING_HOUSING_OWNERS
}

export interface HousingOwnersFetchedAction {
    type: typeof HOUSING_OWNERS_FETCHED,
    owners: Owner[]
}

export interface FetchingHousingEventsAction {
    type: typeof FETCHING_HOUSING_EVENTS
}

export interface HousingEventsFetchedAction {
    type: typeof HOUSING_EVENTS_FETCHED,
    events: OwnerEvent[]
}

export interface FetchHousingListAction {
    type: typeof FETCHING_HOUSING_LIST,
    filters: HousingFilters,
    page: number,
    perPage: number
}

export interface HousingListFetchedAction {
    type: typeof HOUSING_LIST_FETCHED,
    paginatedHousing: PaginatedResult<Housing>,
    filters: HousingFilters
}

export type HousingActionTypes =
    FetchingHousingAction |
    HousingFetchedAction |
    FetchHousingListAction |
    HousingListFetchedAction |
    FetchingHousingOwnersAction |
    HousingOwnersFetchedAction |
    FetchingHousingEventsAction |
    HousingEventsFetchedAction;

export const changeHousingFiltering = (filters: HousingFilters) => {

    return function (dispatch: Dispatch, getState: () => ApplicationState) {

        dispatch(showLoading());

        const page = 1
        const perPage = getState().housing.paginatedHousing.perPage

        dispatch({
            type: FETCHING_HOUSING_LIST,
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
            type: FETCHING_HOUSING_LIST,
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


export const getHousing = (id: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_HOUSING
        });

        housingService.getHousing(id)
            .then(housing => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_FETCHED,
                    housing
                });
            });
    };
};

export const getHousingOwners = (housingId: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_HOUSING_OWNERS
        });

        ownerService.listByHousing(housingId)
            .then(owners => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_OWNERS_FETCHED,
                    owners
                });
            });
    };
};

export const getHousingEvents = (housingId: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_HOUSING_EVENTS
        });

        eventService.listByHousing(housingId)
            .then(events => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_EVENTS_FETCHED,
                    events
                });
            });
    };
};

export const updateHousing = (housing: Housing, housingUpdate: HousingUpdate) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        housingService.updateHousing(housing.id, housingUpdate)
            .then(() => {
                dispatch(hideLoading());
                getHousing(housing.id)(dispatch);
                getHousingEvents(housing.id)(dispatch);
            });

    }
}
