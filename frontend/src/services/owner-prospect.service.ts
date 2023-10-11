import config from '../utils/config';
import { OwnerProspect, OwnerProspectSortable } from '../models/OwnerProspect';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { SortOptions, toQuery } from '../models/Sort';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

export type FindOptions = PaginationOptions &
  SortOptions<OwnerProspectSortable>;

export const ownerProspectApi = createApi({
  reducerPath: 'ownerProspectApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/owner-prospects`,
  }),
  tagTypes: ['OwnerProspect'],
  endpoints: (builder) => ({
    findOwnerProspects: builder.query<
      PaginatedResult<OwnerProspect>,
      { options?: Partial<FindOptions> }
    >({
      query: ({ options }) => {
        const query = new URLSearchParams();
        const sort = toQuery(options?.sort);
        if (sort.length > 0) {
          query.set('sort', sort);
        }
        return {
          url: `?${query}`,
          headers: authService.withAuthHeader(),
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.entities.map(({ id }) => ({
                type: 'OwnerProspect' as const,
                id,
              })),
              'OwnerProspect',
            ]
          : ['OwnerProspect'],
    }),
    createOwnerProspect: builder.mutation<OwnerProspect, OwnerProspect>({
      query: (ownerProspect) => ({
        url: '',
        method: 'POST',
        body: ownerProspect,
      }),
    }),
    updateOwnerProspect: builder.mutation<void, OwnerProspect>({
      query: (ownerProspect) => {
        const { id, ...op } = ownerProspect;
        return {
          url: `${id}`,
          method: 'PUT',
          body: op,
          headers: authService.withAuthHeader(),
        };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'OwnerProspect', id },
      ],
    }),
  }),
});

export const {
  useFindOwnerProspectsQuery,
  useCreateOwnerProspectMutation,
  useUpdateOwnerProspectMutation,
} = ownerProspectApi;
