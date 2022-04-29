import { Dispatch } from 'redux';
import { AuthUser } from '../../models/User';
import authService from '../../services/auth.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import establishmentService from '../../services/establishment.service';
import { Establishment } from '../../models/Establishment';
import { FormState } from './FormState';

export const LOGIN = 'LOGIN';
export const LOGIN_FAIL = 'LOGIN_FAIL';
export const LOGOUT = 'LOGOUT';
export const AVAILABLE_ESTABLISHMENTS_FETCHED = 'AVAILABLE_ESTABLISHMENTS_FETCHED';
export const ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED';
export const ACCOUNT_ACTIVATION_FAILED = 'ACCOUNT_ACTIVATION_FAILED';
export const PASSWORD_CHANGE = 'PASSWORD_CHANGE';

export interface LoginAction {
    type: typeof LOGIN,
    authUser: AuthUser
}
export interface LoginFailAction {
    type: typeof LOGIN_FAIL;
}
export interface LogoutAction {
    type: typeof LOGOUT;
}
export interface AvailableEstablishmentsFetchedAction {
    type: typeof AVAILABLE_ESTABLISHMENTS_FETCHED;
    availableEstablishments: Establishment[];
}
export interface AccountActivatedAction {
    type: typeof ACCOUNT_ACTIVATED;
}
export interface AccountActivationFailedAction {
    type: typeof ACCOUNT_ACTIVATION_FAILED;
}
export interface PasswordChangeAction {
    type: typeof PASSWORD_CHANGE;
    formState: typeof FormState;
}

export type AuthenticationActionTypes =
    LoginAction |
    LoginFailAction |
    LogoutAction |
    AvailableEstablishmentsFetchedAction |
    AccountActivatedAction |
    AccountActivationFailedAction |
    PasswordChangeAction;

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

export const initPasswordChange = () => {
    return function (dispatch: Dispatch) {
        dispatch({
            type: PASSWORD_CHANGE,
            formState: FormState.Init
        });
    }
}

export const changePassword = (currentPassword: string, newPassword: string) => {
    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        authService.changePassword(currentPassword, newPassword)
            .then(() => {
                dispatch({
                    type: PASSWORD_CHANGE,
                    formState: FormState.Succeed
                });
            })
            .catch(() => {
                dispatch({
                    type: PASSWORD_CHANGE,
                    formState: FormState.Error
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
