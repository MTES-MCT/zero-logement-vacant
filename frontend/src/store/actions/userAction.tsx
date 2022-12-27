import { Dispatch } from 'redux';
import { DraftUser, User } from '../../models/User';
import userService from '../../services/user.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { PaginatedResult } from '../../models/PaginatedResult';
import { ApplicationState } from '../reducers/applicationReducers';
import { UserFilters } from '../../models/UserFilters';

export const FETCH_USER_LIST = 'FETCH_USER_LIST';
export const USER_LIST_FETCHED = 'USER_LIST_FETCHED';
export const USER_REMOVED = 'USER_REMOVED';

export interface FetchUserListAction {
  type: typeof FETCH_USER_LIST;
  filters: UserFilters;
  page: number;
  perPage: number;
}

export interface UserListFetchedAction {
  type: typeof USER_LIST_FETCHED;
  paginatedUsers: PaginatedResult<User>;
  filters: UserFilters;
}

export interface UserRemovedAction {
  type: typeof USER_REMOVED;
  id: User['id'];
}

export type UserActionTypes =
  | FetchUserListAction
  | UserListFetchedAction
  | UserRemovedAction;

export const changeUserFiltering = (filters: UserFilters) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const page = 1;
    const perPage = getState().user.paginatedUsers.perPage;

    dispatch({
      type: FETCH_USER_LIST,
      page,
      perPage,
      filters,
    });

    userService
      .listUsers(filters, page, perPage)
      .then((result: PaginatedResult<User>) => {
        dispatch(hideLoading());
        dispatch({
          type: USER_LIST_FETCHED,
          paginatedUsers: result,
          filters,
        });
      });
  };
};

export const changeUserPagination = (page: number, perPage: number) => {
  return function (dispatch: Dispatch, getState: () => ApplicationState) {
    dispatch(showLoading());

    const filters = getState().user.filters;

    dispatch({
      type: FETCH_USER_LIST,
      page: page,
      perPage,
      filters,
    });

    userService
      .listUsers(filters, page, perPage)
      .then((result: PaginatedResult<User>) => {
        dispatch(hideLoading());
        dispatch({
          type: USER_LIST_FETCHED,
          paginatedUsers: result,
          filters,
        });
      });
  };
};

export const removeUser = (userId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    userService.removeUser(userId).then(() => {
      dispatch(hideLoading());
      dispatch<UserRemovedAction>({
        type: USER_REMOVED,
        id: userId,
      });
    });
  };
};

export const createUser = (draftUser: DraftUser) => {
  return async function (dispatch: Dispatch) {
    dispatch(showLoading());
    await userService.createUser(draftUser);
    dispatch(hideLoading());
  };
};
