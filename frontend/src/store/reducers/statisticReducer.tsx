import {
  ANSWERS_COUNT_FETCHED,
  CONTACTED_HOUSING_COUNT_FETCHED,
  ESTABLISHMENTS_COUNT_FETCHED,
  FETCH_STATISTICS,
  HOUSING_EXIT_WITH_SUPPORT,
  HOUSING_EXIT_WITHOUT_SUPPORT,
  HOUSING_IN_PROGRESS_WITH_SUPPORT,
  HOUSING_IN_PROGRESS_WITHOUT_SUPPORT,
  StatisticActionTypes,
  WAITING_HOUSING_COUNT_FETCHED,
} from '../actions/statisticAction';

export interface StatisticState {
  establishmentCount?: number;
  contactedHousingCount?: number;
  waitingHousingCount?: number;
  answersCount?: number;
  housingInProgressWithSupportCount?: number;
  housingInProgressWithoutSupportCount?: number;
  housingExitWithSupportCount?: number;
  housingExitWithoutSupportCount?: number;
}

const initialState: StatisticState = {};

const statisticReducer = (
  state = initialState,
  action: StatisticActionTypes
) => {
  switch (action.type) {
    case FETCH_STATISTICS:
      return {};
    case ESTABLISHMENTS_COUNT_FETCHED: {
      return {
        ...state,
        establishmentCount: action.count,
      };
    }
    case CONTACTED_HOUSING_COUNT_FETCHED: {
      return {
        ...state,
        contactedHousingCount: action.count,
      };
    }
    case WAITING_HOUSING_COUNT_FETCHED: {
      return {
        ...state,
        waitingHousingCount: action.count,
      };
    }
    case ANSWERS_COUNT_FETCHED: {
      return {
        ...state,
        answersCount: action.count,
      };
    }
    case HOUSING_IN_PROGRESS_WITH_SUPPORT: {
      return {
        ...state,
        housingInProgressWithSupportCount: action.count,
      };
    }
    case HOUSING_IN_PROGRESS_WITHOUT_SUPPORT: {
      return {
        ...state,
        housingInProgressWithoutSupportCount: action.count,
      };
    }
    case HOUSING_EXIT_WITH_SUPPORT: {
      return {
        ...state,
        housingExitWithSupportCount: action.count,
      };
    }
    case HOUSING_EXIT_WITHOUT_SUPPORT: {
      return {
        ...state,
        housingExitWithoutSupportCount: action.count,
      };
    }
    default:
      return state;
  }
};

export default statisticReducer;
