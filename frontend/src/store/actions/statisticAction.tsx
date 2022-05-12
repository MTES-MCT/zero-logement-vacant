import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import statisticService from '../../services/statistic.service';

export const FETCH_STATISTICS = 'FETCH_CONTACTED_OWNERS';
export const ESTABLISHMENTS_COUNT_FETCHED = 'ESTABLISHMENTS_COUNT_FETCHED';
export const CONTACTED_OWNERS_COUNT_FETCHED = 'CONTACTED_OWNERS_COUNT_FETCHED';
export const ANSWERS_COUNT_FETCHED = 'ANSWERS_COUNT_FETCHED';
export const HOUSING_FOLLOWED_COUNT_FETCHED = 'HOUSING_FOLLOWED_COUNT_FETCHED';
export const HOUSING_SUPPORTED_COUNT_FETCHED = 'HOUSING_SUPPORTED_COUNT_FETCHED';
export const HOUSING_OUT_OF_VACANCY_COUNT_FETCHED = 'HOUSING_OUT_OF_VACANCY_COUNT_FETCHED';

export interface FetchStatisticsAction {
    type: typeof FETCH_STATISTICS
}

export interface EstablishmentsCountFetchedAction {
    type: typeof ESTABLISHMENTS_COUNT_FETCHED,
    count: number
}

export interface ContactedOwnersCountFetchedAction {
    type: typeof CONTACTED_OWNERS_COUNT_FETCHED,
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

export interface HousingSupportedCountFetchedAction {
    type: typeof HOUSING_SUPPORTED_COUNT_FETCHED,
    count: number
}

export interface HousingOutOfVacancyCountFetchedAction {
    type: typeof HOUSING_OUT_OF_VACANCY_COUNT_FETCHED,
    count: number
}

export type StatisticActionTypes =
    FetchStatisticsAction |
    EstablishmentsCountFetchedAction |
    ContactedOwnersCountFetchedAction |
    AnswersCountFetchedAction |
    HousingFollowedCountFetchedAction|
    HousingSupportedCountFetchedAction |
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
            statisticService.getContactedOwnersCount()
                .then(count => {
                    dispatch({
                        type: CONTACTED_OWNERS_COUNT_FETCHED,
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
            statisticService.getHousingSupportedCount()
                .then(count => {
                    dispatch({
                        type: HOUSING_SUPPORTED_COUNT_FETCHED,
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



