import { UserAccount } from '../models/User';
import { zlvApi } from './api.service';

export const userAccountApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserAccount: builder.query<UserAccount, void>({
      query: () => 'account',
      providesTags: () => ['Account'],
    }),
    updateUserAccount: builder.mutation<void, UserAccount>({
      query: (userAccount) => ({
        url: 'account',
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
        url: 'account/password',
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
