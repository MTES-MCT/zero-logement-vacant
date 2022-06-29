import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { EstablishmentData } from '../../models/Establishment';
import establishmentService from '../../services/establishment.service';
import statisticService from '../../services/statistic.service';
import { HousingStatusCount } from '../../models/HousingState';
import { UserFilters } from '../../models/UserFilters';
import { MonitoringFilters } from '../../models/MonitoringFilters';

export const FETCH_HOUSING_BY_STATUS_COUNT = 'FETCH_HOUSING_BY_STATUS_COUNT';
export const HOUSING_BY_STATUS_COUNT_FETCHED = 'HOUSING_BY_STATUS_COUNT_FETCHED';
export const FETCHING_ESTABLISHMENT_DATA = 'FETCHING_ESTABLISHMENT_DATA';
export const ESTABLISHMENT_DATA_FETCHED = 'ESTABLISHMENT_DATA_FETCHED';

export interface FetchHousingByStatusCountAction {
    type: typeof FETCH_HOUSING_BY_STATUS_COUNT,
    filters: UserFilters
}

export interface HousingByStatusCountFetchedAction {
    type: typeof HOUSING_BY_STATUS_COUNT_FETCHED,
    housingByStatus: HousingStatusCount[],
    filters: UserFilters
}

export interface FetchingEstablishmentDataAction {
    type: typeof FETCHING_ESTABLISHMENT_DATA,
    filters: UserFilters
}

export interface EstablishmentDataFetchedAction {
    type: typeof ESTABLISHMENT_DATA_FETCHED,
    establishmentData: EstablishmentData[],
    filters: UserFilters
}

export type MonitoringActionTypes =
    FetchHousingByStatusCountAction |
    HousingByStatusCountFetchedAction |
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
