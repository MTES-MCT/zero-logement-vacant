import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import config from '../utils/config';
import authService from './auth.service';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { fromGroupDTO, Group } from '../models/Group';
import { GroupFilters } from '../models/GroupFilters';
import { GroupDTO } from '../../../shared/models/GroupDTO';
import fp from 'lodash/fp';
import { GroupPayload } from '../models/GroupPayload';
import { housingApi } from './housing.service';

interface FindOptions extends PaginationOptions {
  filters: GroupFilters;
}

export const groupApi = createApi({
  reducerPath: 'groupApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/groups`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Group'],
  endpoints: (builder) => ({
    findGroups: builder.query<Group[], FindOptions | void>({
      query: () => '',
      providesTags: (groups) =>
        groups
          ? [
              ...groups.map((group) => ({
                type: 'Group' as const,
                id: group.id,
              })),
              { type: 'Group', id: 'LIST' },
            ]
          : [{ type: 'Group', id: 'LIST' }],
      transformResponse: (groups: GroupDTO[]) => groups.map(fromGroupDTO),
    }),
    getGroup: builder.query<Group, string>({
      query: (id: string) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Group', id }],
      transformResponse: (group: GroupDTO) => fromGroupDTO(group),
    }),
    createGroup: builder.mutation<
      { status: number; group: Group },
      GroupPayload
    >({
      query: (group) => ({
        url: '',
        method: 'POST',
        body: group,
      }),
      invalidatesTags: [{ type: 'Group', id: 'LIST' }],
      transformResponse: (group: GroupDTO, meta) => {
        return {
          status: meta?.response?.status ?? 201,
          group: fromGroupDTO(group),
        };
      },
    }),
    updateGroup: builder.mutation<void, GroupPayload & Pick<Group, 'id'>>({
      query: ({ id, ...group }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: group,
      }),
      invalidatesTags: (result, error, args) => [
        { type: 'Group', id: args.id },
      ],
    }),
    addGroupHousing: builder.mutation<
      void,
      GroupPayload['housing'] & Pick<Group, 'id'>
    >({
      query: (group) => ({
        url: `/${group.id}/housing`,
        method: 'POST',
        body: fp.omit(['id'], group),
      }),
      invalidatesTags: (result, error, args) => [
        { type: 'Group', id: args.id },
      ],
      onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(
          housingApi.util.invalidateTags([
            'Housing',
            'HousingByStatus',
            'HousingCountByStatus',
          ])
        );
      },
    }),
    removeGroupHousing: builder.mutation<
      void,
      GroupPayload['housing'] & Pick<Group, 'id'>
    >({
      query: (group) => ({
        url: `/${group.id}/housing`,
        method: 'DELETE',
        body: fp.omit(['id'], group),
      }),
      invalidatesTags: (result, error, args) => [
        { type: 'Group', id: args.id },
      ],
      onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(
          housingApi.util.invalidateTags([
            'Housing',
            'HousingByStatus',
            'HousingCountByStatus',
          ])
        );
      },
    }),
    removeGroup: builder.mutation<void, Group>({
      query: (group) => ({
        url: `/${group.id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, group) => [
        { type: 'Group', id: group.id },
      ],
    }),
  }),
});

export const {
  useFindGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useAddGroupHousingMutation,
  useRemoveGroupHousingMutation,
  useRemoveGroupMutation,
} = groupApi;
