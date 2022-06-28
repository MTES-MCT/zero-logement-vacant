import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { EstablishmentData } from '../../models/Establishment';
import establishmentService from '../../services/establishment.service';
import statisticService from '../../services/statistic.service';
import { HousingStatusCount } from '../../models/HousingState';

export const FETCH_HOUSING_BY_STATUS_COUNT = 'FETCH_HOUSING_BY_STATUS_COUNT';
export const HOUSING_BY_STATUS_COUNT_FETCHED = 'HOUSING_BY_STATUS_COUNT_FETCHED';
export const FETCHING_ESTABLISHMENT_DATA = 'FETCHING_ESTABLISHMENT_DATA';
export const ESTABLISHMENT_DATA_FETCHED = 'ESTABLISHMENT_DATA_FETCHED';

export interface FetchHousingByStatusCountAction {
    type: typeof FETCH_HOUSING_BY_STATUS_COUNT
}

export interface HousingByStatusCountFetchedAction {
    type: typeof HOUSING_BY_STATUS_COUNT_FETCHED,
    housingByStatus: HousingStatusCount[]
}

export interface FetchingEstablishmentDataAction {
    type: typeof FETCHING_ESTABLISHMENT_DATA
}

export interface EstablishmentDataFetchedAction {
    type: typeof ESTABLISHMENT_DATA_FETCHED,
    establishmentData: EstablishmentData[]
}

export type MonitoringActionTypes =
    FetchHousingByStatusCountAction |
    HousingByStatusCountFetchedAction |
    FetchingEstablishmentDataAction |
    EstablishmentDataFetchedAction;


export const fetchEstablishmentData = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCHING_ESTABLISHMENT_DATA
        });

        establishmentService.listEstablishmentData()
            .then(establishmentData => {
                dispatch(hideLoading());
                dispatch({
                    type: ESTABLISHMENT_DATA_FETCHED,
                    establishmentData
                });
            });
    };
};


export const fetchHousingByStatusCount = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_HOUSING_BY_STATUS_COUNT
        });

        Promise.all([
            statisticService.getHousingByStatusCount()
                .then(housingByStatus => {
                    dispatch({
                        type: HOUSING_BY_STATUS_COUNT_FETCHED,
                        housingByStatus
                    });
                })
        ]).then(() => dispatch(hideLoading()))

    };
};
