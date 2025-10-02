import type {
  UserUpdatePayload,
  UserDTO,
  UserFilters
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns/fp';

import { fromUserDTO, type DraftUser, type User } from '~/models/User';
import { zlvApi } from '~/services/api.service';

export interface FindOptions {
  filters?: UserFilters;
}

export const userApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findUsers: builder.query<User[], FindOptions | void>({
      query: (options) => ({
        url: 'users',
        params: options
          ? {
              ...options?.filters
            }
          : {}
      }),
      transformResponse: (users: UserDTO[]) => users.map(fromUserDTO),
      providesTags: (users) =>
        users
          ? [
              ...users.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' }
            ]
          : [{ type: 'User', id: 'LIST' }]
    }),

    getUser: builder.query<User, string>({
      query: (userId) => `users/${userId}`,
      transformResponse: (r) => parseUser(r),
      providesTags: (result) =>
        result
          ? [
              {
                type: 'User' as const,
                id: result.id
              }
            ]
          : []
    }),

    updateUser: builder.mutation<User, UserUpdatePayload & { id: string }>({
      query: ({ id, ...payload }) => ({
        method: 'PUT',
        url: `users/${id}`,
        body: payload
      }),
      transformResponse: (user: UserDTO) => fromUserDTO(user),
      invalidatesTags: (result) =>
        result ? [{ type: 'User', id: result.id }] : []
    }),

    createUser: builder.mutation<User, DraftUser>({
      query: (draftUser) => ({
        url: 'users/creation',
        method: 'POST',
        body: draftUser
      }),
      transformResponse: (response) => parseUser(response),
      invalidatesTags: [{ type: 'User', id: 'PARTIAL-LIST' }]
    })
  })
});

const parseUser = (u: any): User =>
  ({
    ...u,
    activatedAt: parseISO(u.activatedAt)
  }) as User;

export const {
  useFindUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useCreateUserMutation
} = userApi;
