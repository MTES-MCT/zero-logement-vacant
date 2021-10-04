import { combineReducers } from 'redux';
import authenticationReducer, { AuthenticationState } from './authenticationReducer';
import housingReducer, { HousingState } from './housingReducer';
import { loadingBarReducer } from 'react-redux-loading-bar';
import ownerReducer, { OwnerState } from './ownerReducer';

const applicationReducer = combineReducers({
    authentication: authenticationReducer,
    housing: housingReducer,
    owner: ownerReducer,
    loadingBar: loadingBarReducer
});

export interface ApplicationState {
    authentication: AuthenticationState,
    housing: HousingState,
    owner: OwnerState
}

export default applicationReducer;
