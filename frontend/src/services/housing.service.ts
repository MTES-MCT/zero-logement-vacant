import config from '../utils/config';
import authService from './auth.service';
import {
  HousingFilters,
  HousingFiltersForTotalCount,
} from '../models/HousingFilters';
import { Housing, HousingSort, HousingUpdate } from '../models/Housing';
import {
  HousingPaginatedResult,
  PaginatedResult,
} from '../models/PaginatedResult';
import { initialHousingFilters } from '../store/reducers/housingReducer';
import { toTitleCase } from '../utils/stringUtils';
import { parseISO } from 'date-fns';
import { SortOptions, toQuery } from '../models/Sort';
import { AbortOptions, createHttpService } from '../utils/fetchUtils';
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
  } as Housing);

export const housingApi = createApi({
  reducerPath: 'housingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/housing`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Housing', 'HousingByStatus'],
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
        url:
          toQuery(opts?.sort).length > 0 ? `?sort=${toQuery(opts?.sort)}` : '',
        method: 'POST',
        body: {
          filters: opts?.filters,
          ...opts?.pagination,
        },
      }),
      providesTags: (result, errors, args) => [
        ...(args.filters.status?.map((status) => ({
          type: 'HousingByStatus' as const,
          id: status,
        })) ?? []),
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
    countHousing: builder.query<
      HousingCount,
      HousingFilters | HousingFiltersForTotalCount
    >({
      query: (filters) => ({
        url: 'count',
        method: 'POST',
        body: { filters },
      }),
    }),
    updateHousing: builder.mutation<
      void,
      { housingId: string; housingUpdate: HousingUpdate }
    >({
      query: ({ housingId, housingUpdate }) => ({
        url: housingId,
        method: 'POST',
        body: {
          housingUpdate,
        },
      }),
      invalidatesTags: (result, error, { housingId, housingUpdate }) => [
        { type: 'Housing', id: housingId },
        { type: 'HousingByStatus', id: housingUpdate.statusUpdate?.status },
      ],
    }),
    updateHousingList: builder.mutation<
      void,
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
      invalidatesTags: (
        result,
        error,
        { allHousing, housingIds, housingUpdate }
      ) => [
        ...(allHousing
          ? ['Housing' as const]
          : housingIds.map((housingId) => ({
              type: 'Housing' as const,
              id: housingId,
            }))),
        { type: 'HousingByStatus', id: housingUpdate.statusUpdate?.status },
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

const http = createHttpService('housing');

const quickSearchService = (): {
  abort: () => void;
  fetch: (query: string) => Promise<PaginatedResult<Housing>>;
} => {
  const controller = new AbortController();
  const signal = controller.signal;

  return {
    abort: () => controller.abort(),
    fetch: (query: string) =>
      fetch(`${config.apiEndpoint}/api/housing`, {
        method: 'POST',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: { ...initialHousingFilters, query },
          page: 1,
          perPage: 20,
        }),
        signal,
      })
        .then((_) => _.json())
        .then((result) => ({
          ...result,
          entities: result.entities.map(parseHousing),
        })),
  };
};

const housingService = {
  quickSearchService,
};

export default housingService;
