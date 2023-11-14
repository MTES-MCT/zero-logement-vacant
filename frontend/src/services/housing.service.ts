import config from '../utils/config';
import authService from './auth.service';
import { HousingFilters } from '../models/HousingFilters';
import { Housing, HousingSort, HousingUpdate } from '../models/Housing';
import { HousingPaginatedResult } from '../models/PaginatedResult';
import { toTitleCase } from '../utils/stringUtils';
import { parseISO } from 'date-fns';
import { SortOptions, toQuery } from '../models/Sort';
import { AbortOptions, getURLQuery } from '../utils/fetchUtils';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { parseOwner } from './owner.service';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { HousingCount } from '../models/HousingCount';

export interface FindOptions
  extends PaginationOptions,
    SortOptions<HousingSort>,
    AbortOptions {
  filters: HousingFilters;
}

export const parseHousing = (h: any): Housing =>
  ({
    ...h,
    rawAddress: h.rawAddress
      .filter((_: string) => _)
      .map((_: string) => toTitleCase(_)),
    owner: h.owner?.id ? parseOwner(h.owner) : undefined,
    lastContact: h.lastContact ? parseISO(h.lastContact) : undefined,
    energyConsumptionAt: h.energyConsumptionAt
      ? parseISO(h.energyConsumptionAt)
      : undefined,
  } as Housing);

export const housingApi = createApi({
  reducerPath: 'housingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/housing`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Housing', 'HousingByStatus', 'HousingCountByStatus'],
  endpoints: (builder) => ({
    getHousing: builder.query<Housing, string>({
      query: (housingId) => housingId,
      transformResponse: parseHousing,
      providesTags: (result) =>
        result
          ? [
              {
                type: 'Housing' as const,
                id: result.id,
              },
            ]
          : [],
    }),
    findHousing: builder.query<HousingPaginatedResult, FindOptions>({
      query: (opts) => ({
        url: getURLQuery({
          sort: toQuery(opts?.sort),
        }),
        method: 'POST',
        body: {
          filters: opts?.filters,
          ...opts?.pagination,
        },
      }),
      providesTags: (result, errors, args) => [
        {
          type: 'HousingByStatus' as const,
          id: args.filters.status,
        },
        ...(result?.entities.map(({ id }) => ({
          type: 'Housing' as const,
          id,
        })) ?? []),
      ],
      transformResponse: (response: any) => {
        return {
          ...response,
          entities: response.entities.map(parseHousing),
        };
      },
    }),
    countHousing: builder.query<HousingCount, HousingFilters>({
      query: (filters) => ({
        url: 'count',
        method: 'POST',
        body: { filters },
      }),
      providesTags: (result, errors, args) => [
        {
          type: 'HousingCountByStatus' as const,
          id: args.status,
        },
      ],
    }),
    updateHousing: builder.mutation<
      void,
      {
        housing: Housing;
        housingUpdate: HousingUpdate;
      }
    >({
      query: ({ housing, housingUpdate }) => ({
        url: housing.id,
        method: 'POST',
        body: {
          housingId: housing.id,
          housingUpdate,
        },
      }),
      invalidatesTags: (result, error, { housing, housingUpdate }) => [
        { type: 'Housing', id: housing.id },
        { type: 'HousingByStatus', id: housingUpdate.statusUpdate?.status },
        { type: 'HousingByStatus', id: housing.status },
        {
          type: 'HousingCountByStatus',
          id: housingUpdate.statusUpdate?.status,
        },
        {
          type: 'HousingCountByStatus',
          id: housing.status,
        },
      ],
    }),
    updateHousingList: builder.mutation<
      number,
      {
        housingUpdate: HousingUpdate;
        allHousing: boolean;
        housingIds: string[];
        filters: HousingFilters;
      }
    >({
      query: ({ housingUpdate, allHousing, housingIds, filters }) => ({
        url: 'list',
        method: 'POST',
        body: {
          housingUpdate,
          allHousing,
          housingIds,
          filters,
        },
      }),
      transformResponse: (response: any) => {
        return response.length;
      },
      invalidatesTags: (
        result,
        error,
        { allHousing, housingIds, housingUpdate, filters }
      ) => [
        ...(allHousing
          ? ['Housing' as const]
          : housingIds.map((housingId) => ({
              type: 'Housing' as const,
              id: housingId,
            }))),
        { type: 'HousingByStatus', id: housingUpdate.statusUpdate?.status },
        { type: 'HousingByStatus', id: filters.status },
        {
          type: 'HousingCountByStatus',
          id: housingUpdate.statusUpdate?.status,
        },
        {
          type: 'HousingCountByStatus',
          id: filters.status,
        },
      ],
    }),
  }),
});

export const {
  useGetHousingQuery,
  useFindHousingQuery,
  useCountHousingQuery,
  useUpdateHousingMutation,
  useUpdateHousingListMutation,
} = housingApi;
