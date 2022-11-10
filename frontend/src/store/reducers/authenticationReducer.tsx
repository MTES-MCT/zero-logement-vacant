import {
    AuthenticationActionTypes,
    AVAILABLE_ESTABLISHMENTS_FETCHED,
    LOGIN,
    LOGIN_FAIL,
    LOGOUT, PASSWORD_CHANGE,
} from '../actions/authenticationAction';
import { AuthUser } from '../../models/User';
import { Establishment } from '../../models/Establishment';
import { FormState } from '../actions/FormState';

const authUser = JSON.parse(localStorage.getItem('authUser') ?? '{}');

export interface AuthenticationState {
    availableEstablishments?: Establishment[];
    isLoggedOut?: boolean;
    authUser: AuthUser;
    loginError?: string;
    passwordFormState?: FormState;
}

const initialState =
    {
      authUser
    };

const authenticationReducer = (state = initialState, action: AuthenticationActionTypes) => {
    switch (action.type) {
        case LOGIN:
            return {
                ...state,
                isLoggedOut: false,
                authUser: action.authUser,
                loginError: null
            };
        case LOGIN_FAIL:
            return {
                ...state,
                isLoggedOut: false,
                authUser: null,
                loginError: 'Échec de l\'authentification'
            };
        case LOGOUT:
            return {
                ...state,
                isLoggedOut: true,
                authUser: null,
            }
        case AVAILABLE_ESTABLISHMENTS_FETCHED:
            return {
                ...state,
                availableEstablishments: action.availableEstablishments
            };
        case PASSWORD_CHANGE:
            return {
                ...state,
                passwordFormState: action.formState
            };
        default:
            return state;
    }
};

export default authenticationReducer;
