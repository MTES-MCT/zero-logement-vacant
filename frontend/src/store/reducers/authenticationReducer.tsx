import {
    ACCOUNT_ACTIVATED,
    ACCOUNT_ACTIVATION_FAILED,
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
    isLoggedIn: boolean;
    accountActivated: boolean;
    authUser: AuthUser;
    loginError?: string;
    activationError?: string;
    passwordFormState?: FormState;
}

const initialState =
    {
      accountActivated: false,
      ...authUser && authUser.accessToken && authUser.establishment.housingScopes instanceof Array
          ? { isLoggedIn: true, authUser: authUser }
          : { isLoggedIn: false, authUser: null }
    };

const authenticationReducer = (state = initialState, action: AuthenticationActionTypes) => {
    switch (action.type) {
        case LOGIN:
            return {
                ...state,
                isLoggedIn: true,
                authUser: action.authUser,
                loginError: null
            };
        case LOGIN_FAIL:
            return {
                ...state,
                isLoggedIn: false,
                authUser: null,
                loginError: 'Échec de l\'authentification'
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
        case ACCOUNT_ACTIVATED:
            return {
                ...state,
                accountActivated: true,
                activationError: null
            };
        case ACCOUNT_ACTIVATION_FAILED:
            return {
                ...state,
                accountActivated: false,
                activationError: 'Échec de l\'activation.'
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
