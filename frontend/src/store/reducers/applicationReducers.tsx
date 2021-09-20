import { combineReducers } from 'redux';
import authenticationReducer, { AuthenticationState } from './authenticationReducer';

const applicationReducer = combineReducers({
    authentication: authenticationReducer
});

export interface ApplicationState {
    authentication: AuthenticationState;
}

export default applicationReducer;
