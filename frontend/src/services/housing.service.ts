import type { TagDescription } from '@reduxjs/toolkit/dist/query/endpointDefinitions';
import type {
  HousingBatchUpdatePayload,
  HousingDTO,
  HousingFiltersDTO,
  HousingUpdatePayloadDTO,
  PaginationOptions
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns';
import type { Housing, HousingSort } from '../models/Housing';
import type { HousingCount } from '../models/HousingCount';
import type { HousingFilters } from '../models/HousingFilters';
import type { HousingPaginatedResult } from '../models/PaginatedResult';
import { toQuery, type SortOptions } from '../models/Sort';
import type { AbortOptions } from '../utils/fetchUtils';
import { zlvApi, type TagType } from './api.service';
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
    rawAddress: h.rawAddress.filter((_: string) => _),
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

    updateManyHousing: builder.mutation<
      ReadonlyArray<HousingDTO>,
      HousingBatchUpdatePayload
    >({
      query: (payload) => {
        if (payload.files?.length) {
          // Upload files with the request body
          const { files, ...json } = payload;
          const body = new FormData();
          files.forEach((file) => {
            body.append('files', file);
          });
          body.set('payload', JSON.stringify(json));
          return {
            url: 'housing',
            method: 'PUT',
            body: body
          };
        }

        return {
          url: 'housing',
          method: 'PUT',
          // Send the payload directly as json
          body: payload
        };
      },
      invalidatesTags: (_result, _error, payload) => {
        const tags: ReadonlyArray<TagDescription<TagType>> = [
          'Housing',
          'HousingByStatus',
          'HousingCountByStatus',
          'Event',
          'HousingEvent'
        ];
        return tags.concat(payload.precisions?.length ? ['Precision'] : []);
      }
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
  useUpdateHousingMutation,
  useUpdateManyHousingMutation
} = housingApi;
