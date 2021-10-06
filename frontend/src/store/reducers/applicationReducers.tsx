import { combineReducers } from 'redux';
import authenticationReducer, { AuthenticationState } from './authenticationReducer';
import housingReducer, { HousingState } from './housingReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
import ownerReducer, { OwnerState } from './ownerReducer';
import campaignReducer, { CampaignState } from './campaignReducer';

const applicationReducer = combineReducers({
    authentication: authenticationReducer,
    housing: housingReducer,
    campaign: campaignReducer,
    owner: ownerReducer,
    loadingBar: loadingBarReducer
});

export interface ApplicationState {
    authentication: AuthenticationState,
    housing: HousingState,
    campaign: CampaignState,
    owner: OwnerState
}

export default applicationReducer;
