import type { TagDescription } from '@reduxjs/toolkit/dist/query/endpointDefinitions';
import type {
  HousingBatchUpdatePayload,
  HousingDTO,
  HousingFiltersDTO,
  HousingPointDTO,
  HousingPointField,
  HousingStatus,
  HousingUpdatePayloadDTO,
  PaginationOptions
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns';

import type { Housing, HousingSort } from '../models/Housing';
import type { HousingCount } from '../models/HousingCount';
import type { HousingFilters } from '../models/HousingFilters';
import { toQuery, type SortOptions } from '../models/Sort';
import type { AbortOptions } from '../utils/fetchUtils';
import { zlvApi, type TagType } from './api.service';
import { parseOwner } from './owner.service';

export interface FindOptions
  extends PaginationOptions, SortOptions<HousingSort>, AbortOptions {
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

    // Housing list: `GET /housings` returns a bare array of housings (paginated
    // via LIMIT/OFFSET). It does NOT compute a total; consumers read the count
    // from `GET /housings/count` (see `countHousing`), which RTK Query caches
    // per filter-set instead of recomputing it on every page turn.
    findHousing: builder.query<ReadonlyArray<Housing>, FindOptions>({
      query: (opts) => ({
        url: '/housings',
        method: 'GET',
        params: {
          ...opts.filters,
          ...opts.pagination,
          sort: toQuery(opts.sort)
        }
      }),
      transformResponse: (housings: ReadonlyArray<HousingDTO>) =>
        housings.map(parseHousing),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'Housing' as const,
                id
              })),
              { type: 'Housing', id: 'LIST' }
            ]
          : [{ type: 'Housing', id: 'LIST' }]
    }),

    // Lightweight projection for the map: fetches all housings as points via
    // `GET /housing?fields=…`. Callers pick which allowlisted fields they want;
    // the precise result type is derived by the `useHousingPoints` wrapper.
    getHousingPoints: builder.query<
      Partial<HousingPointDTO>[],
      {
        filters: HousingFiltersDTO;
        fields: readonly HousingPointField[];
      } & AbortOptions
    >({
      query: (opts) => ({
        url: '/housings',
        method: 'GET',
        params: {
          ...opts.filters,
          fields: [...opts.fields],
          paginate: false
        }
      }),
      providesTags: ['Housing']
    }),

    // Map view counts hit `GET /housings/count`.
    countHousing: builder.query<HousingCount, HousingFilters>({
      query: (filters) => ({
        url: 'housings/count',
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

    countHousingByStatus: builder.query<
      Record<HousingStatus, HousingCount>,
      HousingFilters
    >({
      query: (filters) => ({
        url: 'housings/count',
        method: 'GET',
        params: {
          ...filters,
          groupBy: 'status'
        }
      }),
      providesTags: ['HousingCountByStatus']
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
          subStatus: payload.subStatus?.length ? payload.subStatus : null,
          actualEnergyConsumption: payload.actualEnergyConsumption ?? null
        } satisfies HousingUpdatePayloadDTO
      }),
      invalidatesTags: (_result, _error, payload) => [
        { type: 'Housing', id: payload.id },
        'HousingByStatus',
        'HousingCountByStatus',
        'Event',
        { type: 'Precision', id: payload.id },
        'Campaign'
      ]
    }),

    updateManyHousing: builder.mutation<
      ReadonlyArray<HousingDTO>,
      HousingBatchUpdatePayload
    >({
      query: (payload) => ({
        url: 'housing',
        method: 'PUT',
        body: payload
      }),
      invalidatesTags: (_result, _error, payload) => {
        const tags: ReadonlyArray<TagDescription<TagType>> = [
          'Housing',
          'HousingByStatus',
          'HousingCountByStatus',
          'Event',
          'HousingEvent',
          'Campaign'
        ];
        return tags
          .concat(payload.precisions?.length ? ['Precision'] : [])
          .concat(payload.documents?.length ? ['Document'] : []);
      }
    })
  })
});

/**
 * Strongly-typed wrapper around `getHousingPoints`: the result type is derived
 * from the exact `fields` requested, bounded to the allowlisted point fields.
 *
 * @example
 * // data is Pick<HousingDTO, 'id' | 'latitude' | 'longitude'>[] | undefined
 * const { data } = useHousingPoints({
 *   filters,
 *   fields: ['id', 'latitude', 'longitude']
 * });
 *
 * RTK Query endpoints are not per-call generic, so the projection type lives
 * here. The narrowing is a boundary assertion — sound because the server honors
 * `fields` via its allowlist projection ({@link HOUSING_POINT_FIELDS}).
 */
export function useHousingPoints<
  const Fields extends readonly HousingPointField[]
>(args: { filters: HousingFiltersDTO; fields: Fields } & AbortOptions) {
  const result = useGetHousingPointsQuery(args);
  return result as Omit<typeof result, 'data'> & {
    data: Pick<HousingDTO, Fields[number]>[] | undefined;
  };
}

export const {
  useGetHousingQuery,
  useFindHousingQuery,
  useGetHousingPointsQuery,
  useLazyGetHousingPointsQuery,
  useCountHousingQuery,
  useCountHousingByStatusQuery,
  useCreateHousingMutation,
  useUpdateHousingMutation,
  useUpdateManyHousingMutation
} = housingApi;
