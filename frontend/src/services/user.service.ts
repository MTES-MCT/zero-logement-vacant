import { DraftUser, User } from '../models/User';
import { parseISO } from 'date-fns';
import { zlvApi } from './api.service';

export const userApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getUser: builder.query<User, string>({
      query: (userId) => `users/${userId}`,
      transformResponse: (r) => parseUser(r),
      providesTags: (result) =>
        result
          ? [
              {
                type: 'User' as const,
                id: result.id,
              }
            ]
          : [],
    }),
    createUser: builder.mutation<User, DraftUser>({
      query: (draftUser) => ({
        url: 'users/creation',
        method: 'POST',
        body: draftUser,
      }),
      transformResponse: (response) => parseUser(response),
      invalidatesTags: [{ type: 'User', id: 'PARTIAL-LIST', }],
    }),
  }),
});

const parseUser = (u: any): User =>
  ({
    ...u,
    activatedAt: parseISO(u.activatedAt),
  } as User);

export const { useGetUserQuery, useCreateUserMutation, } = userApi;
