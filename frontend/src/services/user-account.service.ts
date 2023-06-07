import config from '../utils/config';
import authService from './auth.service';
import { UserAccount } from '../models/User';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

export const userAccountApi = createApi({
  reducerPath: 'userAccountApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/account`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Account'],
  endpoints: (builder) => ({
    getUserAccount: builder.query<UserAccount, void>({
      query: () => '',
      providesTags: () => ['Account'],
    }),
    updateUserAccount: builder.mutation<void, UserAccount>({
      query: (userAccount) => ({
        url: '',
        method: 'PUT',
        body: userAccount,
      }),
      invalidatesTags: () => ['Account'],
    }),
    updatePassword: builder.mutation<
      void,
      { currentPassword: string; newPassword: string }
    >({
      query: ({ currentPassword, newPassword }) => ({
        url: 'password',
        method: 'PUT',
        body: { currentPassword, newPassword },
      }),
    }),
  }),
});

export const {
  useGetUserAccountQuery,
  useUpdateUserAccountMutation,
  useUpdatePasswordMutation,
} = userAccountApi;
