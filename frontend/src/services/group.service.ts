import { GroupDTO, PaginationOptions } from '@zerologementvacant/models';
import { fromGroupDTO, Group } from '../models/Group';
import { GroupFilters } from '../models/GroupFilters';
import { GroupPayload } from '../models/GroupPayload';
import { zlvApi } from './api.service';
import { housingApi } from './housing.service';

interface FindOptions extends PaginationOptions {
  filters: GroupFilters;
}

export const groupApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findGroups: builder.query<Group[], FindOptions | void>({
      query: () => 'groups',
      providesTags: (groups) =>
        groups
          ? [
              ...groups.map((group) => ({
                type: 'Group' as const,
                id: group.id
              })),
              { type: 'Group', id: 'LIST' }
            ]
          : [{ type: 'Group', id: 'LIST' }],
      transformResponse: (groups: GroupDTO[]) => groups.map(fromGroupDTO)
    }),
    getGroup: builder.query<Group, string>({
      query: (id: string) => `groups/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Group', id }],
      transformResponse: (group: GroupDTO) => fromGroupDTO(group)
    }),
    createGroup: builder.mutation<
      { status: number; group: Group },
      GroupPayload
    >({
      query: (group) => ({
        url: 'groups',
        method: 'POST',
        body: group
      }),
      invalidatesTags: [{ type: 'Group', id: 'LIST' }],
      transformResponse: (group: GroupDTO, meta) => {
        return {
          status: meta?.response?.status ?? 201,
          group: fromGroupDTO(group)
        };
      }
    }),
    updateGroup: builder.mutation<void, GroupPayload & Pick<Group, 'id'>>({
      query: ({ id, ...group }) => ({
        url: `groups/${id}`,
        method: 'PUT',
        body: group
      }),
      invalidatesTags: (_result, _error, args) => [{ type: 'Group', id: args.id }]
    }),
    addGroupHousing: builder.mutation<
      void,
      GroupPayload['housing'] & Pick<Group, 'id'>
    >({
      query: ({ id, ...group }) => ({
        url: `groups/${id}/housing`,
        method: 'POST',
        body: group
      }),
      invalidatesTags: (_result, _error, args) => [
        { type: 'Group', id: args.id }
      ],
      onQueryStarted: async (_args, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(
          housingApi.util.invalidateTags([
            'Housing',
            'HousingByStatus',
            'HousingCountByStatus'
          ])
        );
      }
    }),
    removeGroupHousing: builder.mutation<
      void,
      GroupPayload['housing'] & Pick<Group, 'id'>
    >({
      query: ({ id, ...group }) => ({
        url: `groups/${id}/housing`,
        method: 'DELETE',
        body: group
      }),
      invalidatesTags: (_result, _error, args) => [
        { type: 'Group', id: args.id }
      ],
      onQueryStarted: async (_args, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(
          housingApi.util.invalidateTags([
            'Housing',
            'HousingByStatus',
            'HousingCountByStatus'
          ])
        );
      }
    }),
    removeGroup: builder.mutation<void, Group>({
      query: (group) => ({
        url: `groups/${group.id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (_result, _error, group) => [
        { type: 'Group', id: group.id }
      ]
    })
  })
});

export const {
  useFindGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useAddGroupHousingMutation,
  useRemoveGroupHousingMutation,
  useRemoveGroupMutation
} = groupApi;
