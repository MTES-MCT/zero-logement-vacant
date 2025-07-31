import {
  HousingDTO,
  HousingFiltersDTO,
  HousingUpdatePayloadDTO,
  PaginationOptions
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns';
import { Housing, HousingSort, HousingUpdate } from '../models/Housing';
import { HousingCount } from '../models/HousingCount';
import { HousingFilters } from '../models/HousingFilters';
import { HousingPaginatedResult } from '../models/PaginatedResult';
import { SortOptions, toQuery } from '../models/Sort';
import { AbortOptions } from '../utils/fetchUtils';
import { toTitleCase } from '../utils/stringUtils';
import { zlvApi } from './api.service';
import { parseOwner } from './owner.service';

export interface FindOptions
  extends PaginationOptions,
    SortOptions<HousingSort>,
    AbortOptions {
  filters: HousingFiltersDTO;
}

// TODO: add input type
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
        url: '/housing',
        params: {
          ...opts?.filters,
          ...opts?.pagination,
          sort: toQuery(opts?.sort)
        },
        method: 'GET'
      }),
      providesTags: (_result, _errors, args) => [
        {
          type: 'HousingByStatus' as const,
          id: args.filters.status
        },
        ...(_result?.entities.map(({ id }) => ({
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
        method: 'GET',
        params: {
          ...filters
        }
      }),
      providesTags: (_result, _errors, args) => [
        {
          type: 'HousingCountByStatus' as const,
          id: args.status
        }
      ]
    }),
    // TODO: fix this any type
    createHousing: builder.mutation<Housing, any>({
      query: (payload) => ({
        url: 'housing',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Housing', 'HousingByStatus', 'HousingCountByStatus']
    }),

    updateHousing: builder.mutation<
      HousingDTO,
      HousingUpdatePayloadDTO & Pick<Housing, 'id'>
    >({
      query: ({ id, ...payload }) => ({
        url: `housing/${id}`,
        method: 'PUT',
        body: {
          occupancy: payload.occupancy,
          occupancyIntended: payload.occupancyIntended ?? null,
          status: payload.status,
          subStatus: payload.subStatus?.length ? payload.subStatus : null
        } satisfies HousingUpdatePayloadDTO
      }),
      invalidatesTags: (_result, _error, payload) => [
        { type: 'Housing', id: payload.id },
        'HousingByStatus',
        'HousingCountByStatus',
        'Event',
        { type: 'Precision', id: payload.id }
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
        _result,
        _error,
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
  useLazyCountHousingQuery,
  useCreateHousingMutation,
  useUpdateHousingNextMutation,
  useUpdateHousingListMutation
} = housingApi;
