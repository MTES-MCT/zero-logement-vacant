import { AuthenticationActionTypes, LOGIN, LOGIN_FAIL } from '../actions/authenticationAction';

const user = JSON.parse(localStorage.getItem('user') ?? '{}');

export interface AuthenticationState {
    isLoggedIn: boolean;
    user: any;
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
                user: action.user
            };
        case LOGIN_FAIL:
            return {
                ...state,
                isLoggedIn: false,
                user: null
            };
        default:
            return state;
    }
};

export default authenticationReducer;
