import { Dispatch } from 'redux';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import statisticService from '../../services/statistic.service';

export const FETCH_STATISTICS = 'FETCH_CONTACTED_OWNERS';
export const CONTACTED_OWNERS_FETCHED = 'CONTACTED_OWNERS_FETCHED';

export interface FetchStatisticsAction {
    type: typeof FETCH_STATISTICS
}

export interface ContactedOwnersFetchedAction {
    type: typeof CONTACTED_OWNERS_FETCHED,
    count: number
}

export type StatisticActionTypes = FetchStatisticsAction | ContactedOwnersFetchedAction;

export const getContactedOwnersCount = () => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_STATISTICS
        });

        statisticService.getContactedOwnersCount()
            .then(count => {
                dispatch(hideLoading());
                dispatch({
                    type: CONTACTED_OWNERS_FETCHED,
                    count
                });
            });
    };
};



