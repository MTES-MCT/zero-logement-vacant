import { combineReducers } from 'redux';
import authenticationReducer, { AuthenticationState } from './authenticationReducer';
import housingReducer, { HousingState } from './housingReducer';
import { loadingBarReducer } from 'react-redux-loading-bar'

const applicationReducer = combineReducers({
    authentication: authenticationReducer,
    housing: housingReducer,
    loadingBar: loadingBarReducer
});

export interface ApplicationState {
    authentication: AuthenticationState,
    housing: HousingState
}

export default applicationReducer;
