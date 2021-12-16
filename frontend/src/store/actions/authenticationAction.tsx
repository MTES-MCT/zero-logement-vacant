import { Dispatch } from 'redux';
import { AuthUser, Establishment } from '../../models/User';
import authService from '../../services/auth.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import establishmentService from '../../services/establishment.service';

export const LOGIN = 'LOGIN';
export const LOGIN_FAIL = 'LOGIN_FAIL';
export const LOGOUT = 'LOGOUT';
export const AVAILABLE_ESTABLISHMENTS_FETCHED = 'AVAILABLE_ESTABLISHMENTS_FETCHED';

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

export type AuthenticationActionTypes = LoginAction | LoginFail | Logout | AvailableEstablishmentsFetched;

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
