import type { PaginationOptions } from '@zerologementvacant/models';
import type {
  OwnerProspect,
  OwnerProspectSortable
} from '../models/OwnerProspect';
import type { PaginatedResult } from '../models/PaginatedResult';
import type { SortOptions } from '../models/Sort';
import { toQuery } from '../models/Sort';
import { zlvApi } from './api.service';
import authService from './auth.service';

export type FindOptions = PaginationOptions &
  SortOptions<OwnerProspectSortable>;

export const ownerProspectApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOwnerProspects: builder.query<
      PaginatedResult<OwnerProspect>,
      Partial<FindOptions>
    >({
      query: (options) => {
        return {
          url: 'owner-prospects',
          params: {
            sort: toQuery(options.sort)
          },
          headers: authService.withAuthHeader()
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.entities.map(({ id }) => ({
                type: 'OwnerProspect' as const,
                id
              })),
              'OwnerProspect'
            ]
          : ['OwnerProspect']
    }),
    createOwnerProspect: builder.mutation<OwnerProspect, OwnerProspect>({
      query: (ownerProspect) => ({
        url: 'owner-prospects',
        method: 'POST',
        body: ownerProspect
      })
    }),
    updateOwnerProspect: builder.mutation<void, OwnerProspect>({
      query: (ownerProspect) => {
        const { id, ...op } = ownerProspect;
        return {
          url: `owner-prospects/${id}`,
          method: 'PUT',
          body: op,
          headers: authService.withAuthHeader()
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'OwnerProspect', id }
      ]
    })
  })
});

export const {
  useFindOwnerProspectsQuery,
  useCreateOwnerProspectMutation,
  useUpdateOwnerProspectMutation
} = ownerProspectApi;
