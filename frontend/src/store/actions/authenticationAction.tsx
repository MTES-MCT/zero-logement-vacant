import { Dispatch } from 'redux';
import { User } from '../../models/User';
import authService from '../../services/auth.service';

export const LOGIN = 'LOGIN';
export const LOGIN_FAIL = 'LOGIN_FAIL';
export const LOGOUT = 'LOGOUT';

export interface LoginAction {
    type: typeof LOGIN,
    user: User
}
export interface LoginFail {
    type: typeof LOGIN_FAIL;
}
export interface Logout {
    type: typeof LOGOUT;
}

export type AuthenticationActionTypes = LoginAction | LoginFail | Logout;

export const login = (email: string, password: string) => {
    return function (dispatch: Dispatch) {
        authService.login(email, password)
            .then(user => {
                if (user.accessToken) {
                    dispatch({
                        type: LOGIN,
                        user,
                    });
                } else {
                    dispatch({
                        type: LOGIN_FAIL,
                    });
                }
            })
            .catch((error) => {
                dispatch({
                    type: LOGIN_FAIL,
                });
            });
    };
};

export const logout = () => (dispatch: Dispatch) => {
    authService.logout();
    dispatch({
        type: LOGOUT,
    });
};
