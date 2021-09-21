import { Dispatch } from 'redux';
import { User } from '../../models/User';
import authService from '../../services/auth.service';

export const LOGIN = 'LOGIN';
export const LOGIN_FAIL = 'LOGIN_FAIL';

export interface LoginAction {
    type: typeof LOGIN,
    user: User
}
export interface LoginFail {
    type: typeof LOGIN_FAIL;
}

export type AuthenticationActionTypes = LoginAction | LoginFail;

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
