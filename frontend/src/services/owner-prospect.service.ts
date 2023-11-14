import config from '../utils/config';
import { OwnerProspect, OwnerProspectSortable } from '../models/OwnerProspect';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { SortOptions, toQuery } from '../models/Sort';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { getURLSearchParams } from '../utils/fetchUtils';

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
      Partial<FindOptions>
    >({
      query: (options) => {
        return {
          url: `?${getURLSearchParams({
            sort: toQuery(options.sort),
          })}`,
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
