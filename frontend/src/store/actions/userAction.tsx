import { Dispatch } from 'redux';
import { DraftUser, User } from '../../models/User';
import userService from '../../services/user.service';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import { PaginatedResult } from '../../models/PaginatedResult';
import { UserFilters } from '../../models/UserFilters';
import userSlice from '../reducers/userReducer';
import { AppState } from '../store';

export interface FetchUserListAction {
  filters: UserFilters;
  page: number;
  perPage: number;
}

export interface UserListFetchedAction {
  paginatedUsers: PaginatedResult<User>;
  filters: UserFilters;
}

export interface UserRemovedAction {
  id: User['id'];
}

const { fetchUserList, userRemoved, userListFetched } = userSlice.actions;

export const changeUserFiltering = (filters: UserFilters) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const page = 1;
    const perPage = getState().user.paginatedUsers.perPage;

    dispatch(
      fetchUserList({
        page,
        perPage,
        filters,
      })
    );

    userService
      .listUsers(filters, page, perPage)
      .then((result: PaginatedResult<User>) => {
        dispatch(hideLoading());
        dispatch(
          userListFetched({
            paginatedUsers: result,
            filters,
          })
        );
      });
  };
};

export const changeUserPagination = (page: number, perPage: number) => {
  return function (dispatch: Dispatch, getState: () => AppState) {
    dispatch(showLoading());

    const filters = getState().user.filters;

    dispatch(
      fetchUserList({
        page: page,
        perPage,
        filters,
      })
    );

    userService
      .listUsers(filters, page, perPage)
      .then((result: PaginatedResult<User>) => {
        dispatch(hideLoading());
        dispatch(
          userListFetched({
            paginatedUsers: result,
            filters,
          })
        );
      });
  };
};

export const removeUser = (userId: string) => {
  return function (dispatch: Dispatch) {
    dispatch(showLoading());

    userService.removeUser(userId).then(() => {
      dispatch(hideLoading());
      dispatch(
        userRemoved({
          id: userId,
        })
      );
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
