import { combineReducers } from 'redux';
import authenticationReducer, { AuthenticationState } from './authenticationReducer';
import housingReducer, { HousingState } from './housingReducer';

const applicationReducer = combineReducers({
    authentication: authenticationReducer,
    housing: housingReducer
});

export interface ApplicationState {
    authentication: AuthenticationState,
    housing: HousingState
}

export default applicationReducer;
