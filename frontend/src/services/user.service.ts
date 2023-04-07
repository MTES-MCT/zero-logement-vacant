import config from '../utils/config';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { DraftUser, User } from '../models/User';
import { UserFilters } from '../models/UserFilters';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { parseISO } from 'date-fns';
import { UserDTO } from '../../../shared/models/UserDTO';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/users`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    listUsers: builder.query<
      PaginatedResult<User>,
      {
        filters: UserFilters;
        page: number;
        perPage: number;
      }
    >({
      query: ({ filters, page, perPage }) => ({
        url: '',
        method: 'POST',
        body: { filters, page, perPage },
      }),
      transformResponse: (response: PaginatedResult<UserDTO>) => ({
        ...response,
        entities: response.entities.map(parseUser),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.entities.map(({ id }) => ({
                type: 'User' as const,
                id,
              })),
              { type: 'User', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'User', id: 'PARTIAL-LIST' }],
    }),
    createUser: builder.mutation<User, DraftUser>({
      query: (draftUser) => ({
        url: 'creation',
        method: 'POST',
        body: draftUser,
      }),
      transformResponse: (response: UserDTO) => parseUser(response),
      invalidatesTags: [{ type: 'User', id: 'PARTIAL-LIST' }],
    }),
    removeUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: userId,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, userId) => [
        { type: 'User', userId },
        { type: 'User', id: 'PARTIAL-LIST' },
      ],
    }),
  }),
});

const parseUser = (user: UserDTO): User => ({
  ...user,
  activatedAt: parseISO(user.activatedAt),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useRemoveUserMutation,
} = userApi;
