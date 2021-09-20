import { AuthenticationActionTypes, LOGIN, LOGIN_FAIL } from '../actions/authenticationAction';
import { User } from '../../models/User';

const user = JSON.parse(localStorage.getItem('user') ?? '{}');

export interface AuthenticationState {
    isLoggedIn: boolean;
    user: User;
    error: string;
}

const initialState =
    user && user.accessToken
        ? { isLoggedIn: true, user }
        : { isLoggedIn: false, user: null };

const authenticationReducer = (state = initialState, action: AuthenticationActionTypes) => {
    switch (action.type) {
        case LOGIN:
            return {
                ...state,
                isLoggedIn: true,
                user: action.user,
                error: null
            };
        case LOGIN_FAIL:
            return {
                ...state,
                isLoggedIn: false,
                user: null,
                error: 'failed'
            };
        default:
            return state;
    }
};

export default authenticationReducer;
