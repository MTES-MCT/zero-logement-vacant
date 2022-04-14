import { Dispatch } from 'redux';
import { User } from '../../models/User';
import userService from '../../services/user.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { PaginatedResult } from '../../models/PaginatedResult';

export const FETCH_USER_LIST = 'FETCH_USER_LIST';
export const USER_LIST_FETCHED = 'USER_LIST_FETCHED';
export const ACTIVATION_MAIL_SENT = 'ACTIVATION_MAIL_SENT';

export interface FetchUserListAction {
    type: typeof FETCH_USER_LIST,
    page: number,
    perPage: number
}

export interface UserListFetchedAction {
    type: typeof USER_LIST_FETCHED,
    paginatedUsers: PaginatedResult<User>
}

export interface ActivationMailSentAction {
    type: typeof ACTIVATION_MAIL_SENT,
    user: User
}

export type UserActionTypes = FetchUserListAction | UserListFetchedAction | ActivationMailSentAction;

export const changeUserPagination = (page: number, perPage: number) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        dispatch({
            type: FETCH_USER_LIST,
            page: page,
            perPage
        });

        userService.listUsers(page, perPage)
            .then((result: PaginatedResult<User>) => {
                dispatch(hideLoading());
                dispatch({
                    type: USER_LIST_FETCHED,
                    paginatedUsers: result
                });
            });
    };
};

export const sendActivationMail = (userId: string) => {

    return function (dispatch: Dispatch) {

        dispatch(showLoading());

        userService.sendActivationMail(userId)
            .then(user => {
                dispatch(hideLoading());
                dispatch({
                    type: ACTIVATION_MAIL_SENT,
                    user
                });
            });
    };
};



