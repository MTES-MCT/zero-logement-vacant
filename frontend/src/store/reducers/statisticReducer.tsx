import { CONTACTED_OWNERS_FETCHED, FETCH_STATISTICS, StatisticActionTypes } from '../actions/statisticAction';

export interface StatisticState {
    contactedOwnersCount?: number
}

const initialState: StatisticState = {
};

const statisticReducer = (state = initialState, action: StatisticActionTypes) => {
    switch (action.type) {
        case FETCH_STATISTICS:
            return {};
        case CONTACTED_OWNERS_FETCHED: {
            return {
                ...state,
                contactedOwnersCount: action.count
            };
        }
        default:
            return state;
    }
};

export default statisticReducer;
