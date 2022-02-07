import {
    AuthenticationActionTypes,
    AVAILABLE_ESTABLISHMENTS_FETCHED,
    LOGIN,
    LOGIN_FAIL,
    LOGOUT,
} from '../actions/authenticationAction';
import { AuthUser } from '../../models/User';
import { Establishment } from '../../models/Establishment';

const authUser = JSON.parse(localStorage.getItem('authUser') ?? '{}');

export interface AuthenticationState {
    availableEstablishments?: Establishment[];
    isLoggedIn: boolean;
    authUser: AuthUser;
    error?: string;
}

const initialState =
    authUser && authUser.accessToken
        ? { isLoggedIn: true, authUser: authUser }
        : { isLoggedIn: false, authUser: null };

const authenticationReducer = (state = initialState, action: AuthenticationActionTypes) => {
    switch (action.type) {
        case LOGIN:
            return {
                ...state,
                isLoggedIn: true,
                authUser: action.authUser,
                error: null
            };
        case LOGIN_FAIL:
            return {
                ...state,
                isLoggedIn: false,
                authUser: null,
                error: "Échec de l'authentification"
            };
        case LOGOUT:
            return {
                ...state,
                isLoggedIn: false,
                authUser: null,
            }
        case AVAILABLE_ESTABLISHMENTS_FETCHED:
            return {
                ...state,
                availableEstablishments: action.availableEstablishments
            }
        default:
            return state;
    }
};

export default authenticationReducer;
