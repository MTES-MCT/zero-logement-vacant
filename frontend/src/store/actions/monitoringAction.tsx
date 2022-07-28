import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { EstablishmentData } from '../../models/Establishment';
import monitoringService from '../../services/monitoring.service';
import {
    FirstContactToContactedSubStatus,
    HousingStatus,
    HousingStatusCount,
    HousingStatusDuration,
} from '../../models/HousingState';
import { MonitoringFilters } from '../../models/MonitoringFilters';
import { PaginatedResult } from '../../models/PaginatedResult';
import { Housing } from '../../models/Housing';
import housingService from '../../services/housing.service';
import config from '../../utils/config';

export const FETCH_HOUSING_BY_STATUS_COUNT = 'FETCH_HOUSING_BY_STATUS_COUNT';
export const HOUSING_BY_STATUS_COUNT_FETCHED = 'HOUSING_BY_STATUS_COUNT_FETCHED';
export const FETCH_HOUSING_BY_STATUS_DURATION = 'FETCH_HOUSING_BY_STATUS_DURATION';
export const HOUSING_BY_STATUS_DURATION_FETCHED = 'HOUSING_BY_STATUS_DURATION_FETCHED';
export const FETCH_HOUSING_TO_CONTACT = 'FETCH_HOUSING_TO_CONTACT';
export const HOUSING_TO_CONTACT_FETCHED = 'HOUSING_TO_CONTACT_FETCHED';
export const FETCHING_ESTABLISHMENT_DATA = 'FETCHING_ESTABLISHMENT_DATA';
export const ESTABLISHMENT_DATA_FETCHED = 'ESTABLISHMENT_DATA_FETCHED';

export interface FetchHousingByStatusCountAction {
    type: typeof FETCH_HOUSING_BY_STATUS_COUNT,
    filters: MonitoringFilters
}

export interface HousingByStatusCountFetchedAction {
    type: typeof HOUSING_BY_STATUS_COUNT_FETCHED,
    housingByStatusCount: HousingStatusCount[],
    filters: MonitoringFilters
}

export interface FetchHousingByStatusDurationAction {
    type: typeof FETCH_HOUSING_BY_STATUS_DURATION,
    filters: MonitoringFilters
}

export interface HousingByStatusDurationFetchedAction {
    type: typeof HOUSING_BY_STATUS_DURATION_FETCHED,
    housingByStatusDuration: HousingStatusDuration[],
    filters: MonitoringFilters
}

export interface FetchHousingToContactAction {
    type: typeof FETCH_HOUSING_TO_CONTACT,
    filters: MonitoringFilters,
    page: number,
    perPage: number
}

export interface HousingToContactFetchedAction {
    type: typeof HOUSING_TO_CONTACT_FETCHED,
    filters: MonitoringFilters,
    paginatedHousing: PaginatedResult<Housing>
}

export interface FetchingEstablishmentDataAction {
    type: typeof FETCHING_ESTABLISHMENT_DATA,
    filters: MonitoringFilters
}

export interface EstablishmentDataFetchedAction {
    type: typeof ESTABLISHMENT_DATA_FETCHED,
    establishmentData: EstablishmentData[],
    filters: MonitoringFilters
}

export type MonitoringActionTypes =
    FetchHousingByStatusCountAction |
    HousingByStatusCountFetchedAction |
    FetchHousingByStatusDurationAction |
    HousingByStatusDurationFetchedAction |
    FetchHousingToContactAction |
    HousingToContactFetchedAction |
    FetchingEstablishmentDataAction |
    EstablishmentDataFetchedAction;


export const fetchEstablishmentData = (filters: MonitoringFilters) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_ESTABLISHMENT_DATA,
            filters
        });

        monitoringService.listEstablishmentData(filters)
            .then(establishmentData => {
                dispatch(hideLoading());
                dispatch({
                    type: ESTABLISHMENT_DATA_FETCHED,
                    establishmentData,
                    filters
                });
            });
    };
};


export const fetchHousingByStatusCount = (filters: MonitoringFilters) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING_BY_STATUS_COUNT,
            filters
        });

        Promise.all([
            monitoringService.getHousingByStatusCount(filters)
                .then(housingByStatusCount => {
                    dispatch({
                        type: HOUSING_BY_STATUS_COUNT_FETCHED,
                        housingByStatusCount,
                        filters
                    });
                })
        ]).then(() => dispatch(hideLoading()))

    };
};


export const fetchHousingByStatusDuration = (filters: MonitoringFilters) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING_BY_STATUS_DURATION,
            filters
        });

        Promise.all([
            monitoringService.getHousingByStatusDuration(filters)
                .then(housingByStatusDuration => {
                    dispatch({
                        type: HOUSING_BY_STATUS_DURATION_FETCHED,
                        housingByStatusDuration,
                        filters
                    });
                })
        ]).then(() => dispatch(hideLoading()))

    };
};


export const fetchHousingToContact = (filters: MonitoringFilters, page: number = 1, perPage: number = config.perPageDefault) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING_TO_CONTACT,
            filters,
            page: page,
            perPage,
        });

        housingService.listHousing({establishmentIds: filters.establishmentIds, status: [HousingStatus.FirstContact], subStatus: [FirstContactToContactedSubStatus]}, page, perPage)
            .then((result: PaginatedResult<Housing>) => {
                dispatch(hideLoading());
                dispatch({
                    type: HOUSING_TO_CONTACT_FETCHED,
                    paginatedHousing: result,
                    filters
                });
            })

    };
};
