import { Dispatch } from 'redux';
import { AuthUser } from '../../models/User';
import authService from '../../services/auth.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';

export const LOGIN = 'LOGIN';
export const LOGIN_FAIL = 'LOGIN_FAIL';
export const LOGOUT = 'LOGOUT';

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

export type AuthenticationActionTypes = LoginAction | LoginFail | Logout;

export const login = (email: string, password: string, establishmentId?: number) => {
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
