import type {
  HousingOwnerDTO,
  OwnerCreationPayload,
  OwnerDTO,
  OwnerFiltersDTO,
  OwnerUpdatePayload,
  PaginatedResponse
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns';

import { paginated } from '@zerologementvacant/models';
import {
  fromHousingOwnerDTO,
  fromOwnerDTO,
  type HousingOwner,
  type Owner
} from '~/models/Owner';
import type { PaginatedResult } from '~/models/PaginatedResult';
import { zlvApi } from '~/services/api.service';
import { toTitleCase } from '~/utils/stringUtils';

type FindOwnersOptions = OwnerFiltersDTO & {
  page?: number;
  perPage?: number;
};

export const ownerApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOwnersNext: builder.query<PaginatedResponse<Owner>, FindOwnersOptions>({
      query: (params) => ({
        url: 'owners',
        method: 'GET',
        params
      }),
      transformResponse: (owners: ReadonlyArray<OwnerDTO>, meta) => {
        const acceptRanges =
          meta?.response?.headers?.get('Accept-Ranges') ?? null;
        const contentRange =
          meta?.response?.headers?.get('Content-Range') ?? null;

        return paginated(owners.map(fromOwnerDTO), {
          acceptRanges,
          contentRange
        });
      },
      providesTags: (result) =>
        result
          ? [
              ...result.entities.map((owner) => ({
                type: 'Owner' as const,
                id: owner.id
              })),
              { type: 'Owner', id: 'LIST' }
            ]
          : [{ type: 'Owner', id: 'LIST' }]
    }),

    getOwner: builder.query<Owner, string>({
      query: (id) => `owners/${id}`,
      transformResponse: (owner: OwnerDTO) => fromOwnerDTO(owner),
      providesTags: (result) =>
        result
          ? [
              {
                type: 'Owner' as const,
                id: result.id
              }
            ]
          : []
    }),

    /**
     * @deprecated Use {@link useFindOwnersNextQuery} instead
     */
    findOwners: builder.query<
      PaginatedResult<Owner>,
      { q: string; page: number; perPage: number }
    >({
      query: ({ q, page, perPage }) => ({
        url: 'owners',
        method: 'POST',
        body: { q, page, perPage }
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.entities.map((owner) => ({
                type: 'Owner' as const,
                id: owner.id
              })),
              { type: 'Owner', id: 'LIST' }
            ]
          : [{ type: 'Owner', id: 'LIST' }],
      transformResponse: (response: any) => {
        return {
          ...response,
          entities: response.entities.map(fromOwnerDTO)
        };
      }
    }),

    findOwnersByHousing: builder.query<HousingOwner[], string>({
      query: (id) => `housings/${id}/owners`,
      providesTags: (result) =>
        result
          ? [
              ...result.map((housingOwner) => ({
                type: 'Owner' as const,
                id: housingOwner.id
              })),
              { type: 'HousingOwner' as const, id: 'LIST' }
            ]
          : [{ type: 'HousingOwner', id: 'LIST' }],
      transformResponse: (housingOwners: HousingOwnerDTO[]) =>
        housingOwners.map(fromHousingOwnerDTO)
    }),

    createOwner: builder.mutation<Owner, OwnerCreationPayload>({
      query: (payload) => ({
        url: 'owners/creation',
        method: 'POST',
        body: payload
      }),
      transformResponse: (owner: OwnerDTO) => fromOwnerDTO(owner),
      invalidatesTags: () => [{ type: 'Owner', id: 'LIST' }]
    }),

    updateOwner: builder.mutation<void, OwnerUpdatePayload & Pick<Owner, 'id'>>(
      {
        query: (payload) => ({
          url: `owners/${payload.id}`,
          method: 'PUT',
          body: payload
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: 'Owner', id },
          { type: 'HousingOwner', id },
          'Housing',
          'Event'
        ]
      }
    ),

    updateHousingOwners: builder.mutation<
      void,
      { housingId: string; housingOwners: HousingOwner[] }
    >({
      query: ({ housingId, housingOwners }) => ({
        url: `/housing/${housingId}/owners`,
        method: 'PUT',
        body: housingOwners
      }),
      invalidatesTags: (_result, _error, { housingId }) => [
        { type: 'HousingOwner', id: 'LIST' },
        { type: 'Housing', id: housingId },
        'Event'
      ]
    })
  })
});

export function parseOwner(owner: OwnerDTO): Owner {
  return {
    ...owner,
    banAddress: owner.banAddress,
    rawAddress: owner.rawAddress
      ? owner.rawAddress
          .filter((_: string) => _)
          .map((_: string) => toTitleCase(_))
      : [],
    fullName: toTitleCase(owner.fullName.replace(/^(MME |M )/i, '')),
    administrator: owner.administrator ? toTitleCase(owner.administrator) : null
  };
}

export const parseHousingOwner = (o: any): HousingOwner => ({
  ...o,
  ...parseOwner(o),
  startDate: o.startDate ? parseISO(o.startDate) : undefined,
  endDate: o.endDate ? parseISO(o.endDate) : undefined
});

export const {
  useGetOwnerQuery,
  useFindOwnersNextQuery,
  useFindOwnersQuery,
  useFindOwnersByHousingQuery,
  useCreateOwnerMutation,
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation
} = ownerApi;
