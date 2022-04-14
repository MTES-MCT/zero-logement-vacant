import { PaginatedResult } from '../../models/PaginatedResult';
import { User } from '../../models/User';
import config from '../../utils/config';
import { ACTIVATION_MAIL_SENT, FETCH_USER_LIST, USER_LIST_FETCHED, UserActionTypes } from '../actions/userAction';

export interface UserState {
    paginatedUsers: PaginatedResult<User>;
}

const initialState: UserState = {
    paginatedUsers: {
        entities: [],
        page: 1,
        perPage: config.perPageDefault,
        totalCount: 0,
        loading: true
    },
};

const userReducer = (state = initialState, action: UserActionTypes) => {
    switch (action.type) {
        case FETCH_USER_LIST:
            return {
                ...state,
                paginatedUsers: {
                    entities: [],
                    totalCount: 0,
                    page: action.page,
                    perPage: action.perPage,
                    loading: true
                }
            };
        case USER_LIST_FETCHED: {
            const isCurrentFetching =
                action.paginatedUsers.page === state.paginatedUsers.page &&
                action.paginatedUsers.perPage === state.paginatedUsers.perPage
            return !isCurrentFetching ? state : {
                ...state,
                paginatedUsers: {
                    ...state.paginatedUsers,
                    entities: action.paginatedUsers.entities,
                    totalCount: action.paginatedUsers.totalCount,
                    loading: false
                }
            };
        }
        case ACTIVATION_MAIL_SENT: {
            console.log('action.user', action.user)
            return {
                ...state,
                paginatedUsers: {
                    ...state.paginatedUsers,
                    entities: state.paginatedUsers.entities.map(u => u.id === action.user.id ? action.user : u)
                }
            }
        }
        default:
            return state;
    }
};

export default userReducer;
