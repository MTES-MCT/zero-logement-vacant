import { HousingFilters } from '../models/HousingFilters';
import { Housing, HousingSort, HousingUpdate } from '../models/Housing';
import { HousingPaginatedResult } from '../models/PaginatedResult';
import { toTitleCase } from '../utils/stringUtils';
import { parseISO } from 'date-fns';
import { SortOptions, toQuery } from '../models/Sort';
import { AbortOptions, getURLQuery } from '../utils/fetchUtils';
import { HousingPayloadDTO, PaginationOptions } from '../../../shared';
import { parseOwner } from './owner.service';
import { HousingCount } from '../models/HousingCount';
import { zlvApi } from './api.service';

export interface FindOptions
  extends PaginationOptions,
    SortOptions<HousingSort>,
    AbortOptions {
  filters: HousingFilters;
}

export function parseHousing(h: any): Housing {
  return {
    ...h,
    rawAddress: h.rawAddress
      .filter((_: string) => _)
      .map((_: string) => toTitleCase(_)),
    owner: h.owner?.id ? parseOwner(h.owner) : undefined,
    lastContact: h.lastContact ? parseISO(h.lastContact) : undefined,
    energyConsumptionAt: h.energyConsumptionAt
      ? parseISO(h.energyConsumptionAt)
      : undefined
  };
}

export const housingApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getHousing: builder.query<Housing, string>({
      query: (housingId) => `housing/${housingId}`,
      transformResponse: parseHousing,
      providesTags: (result) =>
        result
          ? [
              {
                type: 'Housing' as const,
                id: result.id
              }
            ]
          : []
    }),
    findHousing: builder.query<HousingPaginatedResult, FindOptions>({
      query: (opts) => ({
        url: `housing${getURLQuery({
          sort: toQuery(opts?.sort)
        })}`,
        method: 'POST',
        body: {
          filters: opts?.filters,
          ...opts?.pagination
        }
      }),
      providesTags: (result, errors, args) => [
        {
          type: 'HousingByStatus' as const,
          id: args.filters.status
        },
        ...(result?.entities.map(({ id }) => ({
          type: 'Housing' as const,
          id
        })) ?? [])
      ],
      transformResponse: (response: any) => {
        return {
          ...response,
          entities: response.entities.map(parseHousing)
        };
      }
    }),
    countHousing: builder.query<HousingCount, HousingFilters>({
      query: (filters) => ({
        url: 'housing/count',
        method: 'POST',
        body: { filters }
      }),
      providesTags: (result, errors, args) => [
        {
          type: 'HousingCountByStatus' as const,
          id: args.status
        }
      ]
    }),
    createHousing: builder.mutation<Housing, HousingPayloadDTO>({
      query: (payload) => ({
        url: 'housing/creation',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Housing', 'HousingByStatus', 'HousingCountByStatus']
    }),
    updateHousing: builder.mutation<
      void,
      {
        housing: Housing;
        housingUpdate: HousingUpdate;
      }
    >({
      query: ({ housing, housingUpdate }) => ({
        url: `housing/${housing.id}`,
        method: 'POST',
        body: {
          housingId: housing.id,
          housingUpdate
        }
      }),
      invalidatesTags: (result, error, { housing, housingUpdate }) => [
        { type: 'Housing', id: housing.id },
        { type: 'HousingByStatus', id: housingUpdate.statusUpdate?.status },
        { type: 'HousingByStatus', id: housing.status },
        {
          type: 'HousingCountByStatus',
          id: housingUpdate.statusUpdate?.status
        },
        {
          type: 'HousingCountByStatus',
          id: housing.status
        }
      ]
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
        url: 'housing/list',
        method: 'POST',
        body: {
          housingUpdate,
          allHousing,
          housingIds,
          filters
        }
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
              id: housingId
            }))),
        { type: 'HousingByStatus', id: housingUpdate.statusUpdate?.status },
        { type: 'HousingByStatus', id: filters.status },
        {
          type: 'HousingCountByStatus',
          id: housingUpdate.statusUpdate?.status
        },
        {
          type: 'HousingCountByStatus',
          id: filters.status
        }
      ]
    })
  })
});

export const {
  useGetHousingQuery,
  useFindHousingQuery,
  useLazyFindHousingQuery,
  useCountHousingQuery,
  useCreateHousingMutation,
  useUpdateHousingMutation,
  useUpdateHousingListMutation
} = housingApi;
