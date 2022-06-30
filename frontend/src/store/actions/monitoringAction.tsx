import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { EstablishmentData } from '../../models/Establishment';
import establishmentService from '../../services/establishment.service';
import statisticService from '../../services/statistic.service';
import { HousingStatusCount } from '../../models/HousingState';
import { MonitoringFilters } from '../../models/MonitoringFilters';

export const FETCH_HOUSING_BY_STATUS_COUNT = 'FETCH_HOUSING_BY_STATUS_COUNT';
export const HOUSING_BY_STATUS_COUNT_FETCHED = 'HOUSING_BY_STATUS_COUNT_FETCHED';
export const FETCH_HOUSING_WAITING_FOR_3_MONTHS_COUNT = 'FETCH_HOUSING_WAITING_FOR_3_MONTHS_COUNT';
export const HOUSING_WAITING_FOR_3_MONTHS_COUNT_FETCHED = 'HOUSING_WAITING_FOR_3_MONTHS_COUNT_FETCHED';
export const FETCHING_ESTABLISHMENT_DATA = 'FETCHING_ESTABLISHMENT_DATA';
export const ESTABLISHMENT_DATA_FETCHED = 'ESTABLISHMENT_DATA_FETCHED';

export interface FetchHousingByStatusCountAction {
    type: typeof FETCH_HOUSING_BY_STATUS_COUNT,
    filters: MonitoringFilters
}

export interface HousingByStatusCountFetchedAction {
    type: typeof HOUSING_BY_STATUS_COUNT_FETCHED,
    housingByStatus: HousingStatusCount[],
    filters: MonitoringFilters
}

export interface FetchHousingWaitingFor3MonthsCountAction {
    type: typeof FETCH_HOUSING_WAITING_FOR_3_MONTHS_COUNT,
    filters: MonitoringFilters
}

export interface HousingWaitingFor3MonthsCountFetchedAction {
    type: typeof HOUSING_WAITING_FOR_3_MONTHS_COUNT_FETCHED,
    count: number,
    filters: MonitoringFilters
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
    FetchHousingWaitingFor3MonthsCountAction |
    HousingWaitingFor3MonthsCountFetchedAction |
    FetchingEstablishmentDataAction |
    EstablishmentDataFetchedAction;


export const fetchEstablishmentData = (filters: MonitoringFilters) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_ESTABLISHMENT_DATA,
            filters
        });

        establishmentService.listEstablishmentData()
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
            statisticService.getHousingByStatusCount(filters)
                .then(housingByStatus => {
                    dispatch({
                        type: HOUSING_BY_STATUS_COUNT_FETCHED,
                        housingByStatus,
                        filters
                    });
                })
        ]).then(() => dispatch(hideLoading()))

    };
};


export const fetchHousingWaitingFor3MonthsCount = (filters: MonitoringFilters) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING_WAITING_FOR_3_MONTHS_COUNT,
            filters
        });

        Promise.all([
            statisticService.getHousingWaitingFor3MonthsCount(filters)
                .then(count => {
                    dispatch({
                        type: HOUSING_WAITING_FOR_3_MONTHS_COUNT_FETCHED,
                        count,
                        filters
                    });
                })
        ]).then(() => dispatch(hideLoading()))

    };
};
