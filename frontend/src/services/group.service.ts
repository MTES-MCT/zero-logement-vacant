import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import config from '../utils/config';
import authService from './auth.service';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { fromGroupDTO, Group } from '../models/Group';
import { GroupFilters } from '../models/GroupFilters';
import { GroupDTO } from '../../../shared/models/GroupDTO';

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
          ? groups.map((group) => ({ type: 'Group' as const, id: group.id }))
          : ['Group'],
      transformResponse: (groups: GroupDTO[]) => groups.map(fromGroupDTO),
    }),
    getGroup: builder.query<Group, string>({
      query: (id: string) => `/${id}`,
      providesTags: (group) =>
        group ? [{ type: 'Group' as const, id: group.id }] : ['Group'],
      transformResponse: (group: GroupDTO) => fromGroupDTO(group),
    }),
    removeGroup: builder.mutation<void, Group>({
      query: (group) => ({
        url: `/${group.id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Group'],
    }),
  }),
});

export const { useFindGroupsQuery, useGetGroupQuery, useRemoveGroupMutation } =
  groupApi;
