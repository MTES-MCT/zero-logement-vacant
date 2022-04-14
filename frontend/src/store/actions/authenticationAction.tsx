import { Dispatch } from 'redux';
import { AuthUser } from '../../models/User';
import authService from '../../services/auth.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import establishmentService from '../../services/establishment.service';
import { Establishment } from '../../models/Establishment';

export const LOGIN = 'LOGIN';
export const LOGIN_FAIL = 'LOGIN_FAIL';
export const LOGOUT = 'LOGOUT';
export const AVAILABLE_ESTABLISHMENTS_FETCHED = 'AVAILABLE_ESTABLISHMENTS_FETCHED';
export const ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED'
export const ACCOUNT_ACTIVATION_FAILED = 'ACCOUNT_ACTIVATION_FAILED'

export interface LoginAction {
    type: typeof LOGIN,
    authUser: AuthUser
}
export interface LoginFail {
    type: typeof LOGIN_FAIL;
}
export interface Logout {
    type: typeof LOGOUT;
}
export interface AvailableEstablishmentsFetched {
    type: typeof AVAILABLE_ESTABLISHMENTS_FETCHED;
    availableEstablishments: Establishment[];
}
export interface AccountActivated {
    type: typeof ACCOUNT_ACTIVATED;
}
export interface AccountActivationFailed {
    type: typeof ACCOUNT_ACTIVATION_FAILED;
}

export type AuthenticationActionTypes = LoginAction | LoginFail | Logout | AvailableEstablishmentsFetched | AccountActivated | AccountActivationFailed;

export const login = (email: string, password: string, establishmentId?: string) => {
    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        authService.login(email, password, establishmentId)
            .then(authUser => {
                if (authUser.accessToken) {
                    dispatch({
                        type: LOGIN,
                        authUser,
                    });
                } else {
                    dispatch({
                        type: LOGIN_FAIL,
                    });
                }
            })
            .catch(() => {
                dispatch({
                    type: LOGIN_FAIL,
                });
            })
            .finally(() => {
                dispatch(hideLoading());
            });
    };
};

export const logout = () => (dispatch: Dispatch) => {
    authService.logout();
    dispatch({
        type: LOGOUT,
    });
};

export const activateAccount = (email: string, tokenId: string, password: string) => {
    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        authService.activateAccount(email, tokenId, password)
            .then(() => {
                dispatch({
                    type: ACCOUNT_ACTIVATED
                });
            })
            .catch(() => {
                dispatch({
                    type: ACCOUNT_ACTIVATION_FAILED,
                });
            })
            .finally(() => {
                dispatch(hideLoading());
            });
    };
};


export const fetchAvailableEstablishments = () => {
    return function (dispatch: Dispatch) {

        establishmentService.listAvailableEstablishments()
            .then(availableEstablishments => {
                dispatch({
                    type: AVAILABLE_ESTABLISHMENTS_FETCHED,
                    availableEstablishments
                });
            })
    };
};
