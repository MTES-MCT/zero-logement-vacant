import config from '../utils/config';
import authService from './auth.service';
import { DraftUser, User } from '../models/User';
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
    createUser: builder.mutation<User, DraftUser>({
      query: (draftUser) => ({
        url: 'creation',
        method: 'POST',
        body: draftUser,
      }),
      transformResponse: (response) => parseUser(response),
      invalidatesTags: [{ type: 'User', id: 'PARTIAL-LIST' }],
    }),
  }),
});

const parseUser = (u: any): User =>
  ({
    ...u,
    activatedAt: parseISO(u.activatedAt),
  } as User);

export const { useGetUserQuery, useCreateUserMutation } = userApi;
