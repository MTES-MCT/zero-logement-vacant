import { combineReducers } from 'redux';
import authenticationReducer, { AuthenticationState } from './authenticationReducer';
import housingReducer, { HousingState } from './housingReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
import ownerReducer, { OwnerState } from './ownerReducer';
import campaignReducer, { CampaignState } from './campaignReducer';
import userReducer, { UserState } from './userReducer';

const applicationReducer = combineReducers({
    authentication: authenticationReducer,
    housing: housingReducer,
    campaign: campaignReducer,
    owner: ownerReducer,
    user: userReducer,
    loadingBar: loadingBarReducer
});

export interface ApplicationState {
    authentication: AuthenticationState,
    housing: HousingState,
    campaign: CampaignState,
    owner: OwnerState,
    user: UserState
}

export default applicationReducer;
