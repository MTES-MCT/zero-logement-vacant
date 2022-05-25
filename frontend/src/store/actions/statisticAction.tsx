import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import statisticService from '../../services/statistic.service';

export const FETCH_STATISTICS = 'FETCH_CONTACTED_OWNERS';
export const ESTABLISHMENTS_COUNT_FETCHED = 'ESTABLISHMENTS_COUNT_FETCHED';
export const CONTACTED_HOUSING_COUNT_FETCHED = 'CONTACTED_HOUSING_COUNT_FETCHED';
export const WAITING_HOUSING_COUNT_FETCHED = 'WAITING_HOUSING_COUNT_FETCHED';
export const ANSWERS_COUNT_FETCHED = 'ANSWERS_COUNT_FETCHED';
export const HOUSING_FOLLOWED_COUNT_FETCHED = 'HOUSING_FOLLOWED_COUNT_FETCHED';
export const HOUSING_FIRST_CONTACTED_COUNT_FETCHED = 'HOUSING_FIRST_CONTACTED_COUNT_FETCHED';
export const HOUSING_OUT_OF_VACANCY_COUNT_FETCHED = 'HOUSING_OUT_OF_VACANCY_COUNT_FETCHED';

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

export interface HousingFollowedCountFetchedAction {
    type: typeof HOUSING_FOLLOWED_COUNT_FETCHED,
    count: number
}

export interface HousingFirstContactedCountFetchedAction {
    type: typeof HOUSING_FIRST_CONTACTED_COUNT_FETCHED,
    count: number
}

export interface HousingOutOfVacancyCountFetchedAction {
    type: typeof HOUSING_OUT_OF_VACANCY_COUNT_FETCHED,
    count: number
}

export type StatisticActionTypes =
    FetchStatisticsAction |
    EstablishmentsCountFetchedAction |
    ContactedHousingCountFetchedAction |
    WaitingHousingCountFetchedAction |
    AnswersCountFetchedAction |
    HousingFollowedCountFetchedAction|
    HousingFirstContactedCountFetchedAction |
    HousingOutOfVacancyCountFetchedAction;

export const getContactedOwnersCount = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_STATISTICS
        });

        Promise.all([
            statisticService.getEstablishmentsCount()
                .then(count => {
                    dispatch({
                        type: ESTABLISHMENTS_COUNT_FETCHED,
                        count
                    });
                }),
            statisticService.getContactedHousingCount()
                .then(count => {
                    dispatch({
                        type: CONTACTED_HOUSING_COUNT_FETCHED,
                        count
                    });
                }),
            statisticService.getWaitingHousingCount()
                .then(count => {
                    dispatch({
                        type: WAITING_HOUSING_COUNT_FETCHED,
                        count
                    });
                }),
            statisticService.getAnswersCount()
                .then(count => {
                    dispatch({
                        type: ANSWERS_COUNT_FETCHED,
                        count
                    });
                }),
            statisticService.getHousingFollowedCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_FOLLOWED_COUNT_FETCHED,
                        count
                    });
                }),
            statisticService.getHousingFirstContactedCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_FIRST_CONTACTED_COUNT_FETCHED,
                        count
                    });
                }),
            statisticService.getHousingOutOfVacancyCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_OUT_OF_VACANCY_COUNT_FETCHED,
                        count
                    });
                })
        ]).then(() => dispatch(hideLoading()))

    };
};



