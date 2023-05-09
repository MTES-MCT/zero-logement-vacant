import config from '../utils/config';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { DraftUser, User } from '../models/User';
import { UserFilters } from '../models/UserFilters';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { parseISO } from 'date-fns';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/users`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getUser: builder.query<User, string>({
      query: (userId) => userId,
      transformResponse: (r) => parseUser(r),
      providesTags: (result) =>
        result
          ? [
              {
                type: 'User' as const,
                id: result.id,
              },
            ]
          : [],
    }),
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
      transformResponse: (response: PaginatedResult<User>) => ({
        ...response,
        entities: response.entities.map((e: any) => parseUser(e)),
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
      transformResponse: (response) => parseUser(response),
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

const parseUser = (u: any): User =>
  ({
    ...u,
    activatedAt: parseISO(u.activatedAt),
  } as User);

export const {
  useGetUserQuery,
  useListUsersQuery,
  useCreateUserMutation,
  useRemoveUserMutation,
} = userApi;
