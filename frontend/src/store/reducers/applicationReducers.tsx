import { combineReducers } from 'redux';
import authenticationReducer, { AuthenticationState } from './authenticationReducer';
import housingReducer, { HousingState } from './housingReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
import ownerReducer, { OwnerState } from './ownerReducer';
import campaignReducer, { CampaignState } from './campaignReducer';
import userReducer, { UserState } from './userReducer';
import statisticReducer, { StatisticState } from './statisticReducer';

const applicationReducer = combineReducers({
    authentication: authenticationReducer,
    housing: housingReducer,
    campaign: campaignReducer,
    owner: ownerReducer,
    user: userReducer,
    statistic: statisticReducer,
    loadingBar: loadingBarReducer
});

export interface ApplicationState {
    authentication: AuthenticationState,
    housing: HousingState,
    campaign: CampaignState,
    owner: OwnerState,
    user: UserState,
    statistic: StatisticState
}

export default applicationReducer;
