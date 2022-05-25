import {
    ANSWERS_COUNT_FETCHED,
    CONTACTED_HOUSING_COUNT_FETCHED,
    ESTABLISHMENTS_COUNT_FETCHED,
    FETCH_STATISTICS,
    HOUSING_FOLLOWED_COUNT_FETCHED,
    HOUSING_OUT_OF_VACANCY_COUNT_FETCHED,
    HOUSING_FIRST_CONTACTED_COUNT_FETCHED,
    StatisticActionTypes,
    WAITING_HOUSING_COUNT_FETCHED,
} from '../actions/statisticAction';

export interface StatisticState {
    establishmentCount?: number
    contactedHousingCount?: number
    waitingHousingCount?: number
    answersCount?: number
    housingFollowedCount?: number
    housingFirstContactedCount?: number
    housingOutOfVacancyCount?: number
}

const initialState: StatisticState = {
};

const statisticReducer = (state = initialState, action: StatisticActionTypes) => {
    switch (action.type) {
        case FETCH_STATISTICS:
            return {};
        case ESTABLISHMENTS_COUNT_FETCHED: {
            return {
                ...state,
                establishmentCount: action.count
            };
        }
        case CONTACTED_HOUSING_COUNT_FETCHED: {
            return {
                ...state,
                contactedHousingCount: action.count
            };
        }
        case WAITING_HOUSING_COUNT_FETCHED: {
            return {
                ...state,
                waitingHousingCount: action.count
            };
        }
        case ANSWERS_COUNT_FETCHED: {
            return {
                ...state,
                answersCount: action.count
            };
        }
        case HOUSING_FOLLOWED_COUNT_FETCHED: {
            return {
                ...state,
                housingFollowedCount: action.count
            };
        }
        case HOUSING_FIRST_CONTACTED_COUNT_FETCHED: {
            return {
                ...state,
                housingFirstContactedCount: action.count
            };
        }
        case HOUSING_OUT_OF_VACANCY_COUNT_FETCHED: {
            return {
                ...state,
                housingOutOfVacancyCount: action.count
            };
        }
        default:
            return state;
    }
};

export default statisticReducer;
