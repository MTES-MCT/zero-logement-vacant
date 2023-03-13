import { PaginatedResult } from '../../models/PaginatedResult';
import { User } from '../../models/User';
import config from '../../utils/config';
import {
  FetchUserListAction,
  UserListFetchedAction,
  UserRemovedAction,
} from '../actions/userAction';
import { UserFilters } from '../../models/UserFilters';
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  paginatedUsers: PaginatedResult<User>;
  filters: UserFilters;
}

export const initialUserFilters = {
  establishmentIds: [],
} as UserFilters;

const initialState: UserState = {
  paginatedUsers: {
    entities: [],
    page: 1,
    perPage: config.perPageDefault,
    totalCount: 0,
    filteredCount: 0,
    loading: true,
  },
  filters: initialUserFilters,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    fetchUserList: (
      state: UserState,
      action: PayloadAction<FetchUserListAction>
    ) => {
      state.paginatedUsers = {
        entities: [],
        totalCount: 0,
        filteredCount: 0,
        page: action.payload.page,
        perPage: action.payload.perPage,
        loading: true,
      };
      state.filters = action.payload.filters;
    },
    userListFetched: (
      state: UserState,
      action: PayloadAction<UserListFetchedAction>
    ) => {
      const isCurrentFetching =
        action.payload.filters === current(state).filters &&
        action.payload.paginatedUsers.page ===
          current(state).paginatedUsers.page &&
        action.payload.paginatedUsers.perPage ===
          current(state).paginatedUsers.perPage;
      if (isCurrentFetching) {
        state.paginatedUsers = {
          ...current(state).paginatedUsers,
          entities: action.payload.paginatedUsers.entities,
          filteredCount: action.payload.paginatedUsers.filteredCount,
          totalCount: action.payload.paginatedUsers.totalCount,
          loading: false,
        };
      }
    },
    userRemoved: (
      state: UserState,
      action: PayloadAction<UserRemovedAction>
    ) => {
      state.paginatedUsers = {
        ...state.paginatedUsers,
        entities: state.paginatedUsers.entities.filter(
          (user) => user.id !== action.payload.id
        ),
        filteredCount: state.paginatedUsers.filteredCount - 1,
        totalCount: state.paginatedUsers.totalCount - 1,
      };
    },
  },
});

export default userSlice;
