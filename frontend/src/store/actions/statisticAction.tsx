import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import monitoringService from '../../services/monitoring.service';

export const FETCH_STATISTICS = 'FETCH_STATISTICS';
export const ESTABLISHMENTS_COUNT_FETCHED = 'ESTABLISHMENTS_COUNT_FETCHED';
export const CONTACTED_HOUSING_COUNT_FETCHED = 'CONTACTED_HOUSING_COUNT_FETCHED';
export const WAITING_HOUSING_COUNT_FETCHED = 'WAITING_HOUSING_COUNT_FETCHED';
export const ANSWERS_COUNT_FETCHED = 'ANSWERS_COUNT_FETCHED';
export const HOUSING_IN_PROGRESS_WITH_SUPPORT = 'HOUSING_IN_PROGRESS_WITH_SUPPORT';
export const HOUSING_IN_PROGRESS_WITHOUT_SUPPORT = 'HOUSING_IN_PROGRESS_WITHOUT_SUPPORT';
export const HOUSING_EXIT_WITH_SUPPORT = 'HOUSING_EXIT_WITH_SUPPORT';
export const HOUSING_EXIT_WITHOUT_SUPPORT = 'HOUSING_EXIT_WITHOUT_SUPPORT';

export interface FetchStatisticsAction {
    type: typeof FETCH_STATISTICS
}

export interface EstablishmentsCountFetchedAction {
    type: typeof ESTABLISHMENTS_COUNT_FETCHED,
    count: number
}

export interface ContactedHousingCountFetchedAction {
    type: typeof CONTACTED_HOUSING_COUNT_FETCHED,
    count: number
}

export interface WaitingHousingCountFetchedAction {
    type: typeof WAITING_HOUSING_COUNT_FETCHED,
    count: number
}

export interface AnswersCountFetchedAction {
    type: typeof ANSWERS_COUNT_FETCHED,
    count: number
}

export interface HousingInProgressWithSupportCountFetchedAction {
    type: typeof HOUSING_IN_PROGRESS_WITH_SUPPORT,
    count: number
}

export interface HousingInProgressWithoutSupportCountFetchedAction {
    type: typeof HOUSING_IN_PROGRESS_WITHOUT_SUPPORT,
    count: number
}

export interface HousingExitWithSupportCountFetchedAction {
    type: typeof HOUSING_EXIT_WITH_SUPPORT,
    count: number
}

export interface HousingExitWithoutSupportCountFetchedAction {
    type: typeof HOUSING_EXIT_WITHOUT_SUPPORT,
    count: number
}

export type StatisticActionTypes =
    FetchStatisticsAction |
    EstablishmentsCountFetchedAction |
    ContactedHousingCountFetchedAction |
    WaitingHousingCountFetchedAction |
    AnswersCountFetchedAction |
    HousingInProgressWithSupportCountFetchedAction|
    HousingInProgressWithoutSupportCountFetchedAction |
    HousingExitWithSupportCountFetchedAction |
    HousingExitWithoutSupportCountFetchedAction;

export const getStatistics = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_STATISTICS
        });

        Promise.all([
            monitoringService.getEstablishmentsCount()
                .then(count => {
                    dispatch({
                        type: ESTABLISHMENTS_COUNT_FETCHED,
                        count
                    });
                }),
            monitoringService.getContactedHousingCount()
                .then(count => {
                    dispatch({
                        type: CONTACTED_HOUSING_COUNT_FETCHED,
                        count
                    });
                }),
            monitoringService.getWaitingHousingCount()
                .then(count => {
                    dispatch({
                        type: WAITING_HOUSING_COUNT_FETCHED,
                        count
                    });
                }),
            monitoringService.getAnswersCount()
                .then(count => {
                    dispatch({
                        type: ANSWERS_COUNT_FETCHED,
                        count
                    });
                }),
            monitoringService.getHousingInProgressWithSupportCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_IN_PROGRESS_WITH_SUPPORT,
                        count
                    });
                }),
            monitoringService.getHousingInProgressWithoutSupportCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_IN_PROGRESS_WITHOUT_SUPPORT,
                        count
                    });
                }),
            monitoringService.getHousingExitWithSupportCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_EXIT_WITH_SUPPORT,
                        count
                    });
                }),
            monitoringService.getHousingExitWithoutSupportCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_EXIT_WITHOUT_SUPPORT,
                        count
                    });
                })
        ]).then(() => dispatch(hideLoading()))

    };
};



