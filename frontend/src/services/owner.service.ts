import {
  HousingOwnerDTO,
  OwnerDTO,
  OwnerPayloadDTO
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns';
import {
  fromHousingOwnerDTO,
  fromOwnerDTO,
  HousingOwner,
  Owner
} from '../models/Owner';
import { PaginatedResult } from '../models/PaginatedResult';
import { toTitleCase } from '../utils/stringUtils';
import { zlvApi } from './api.service';

export const ownerApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
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
      query: (housingId) => `owners/housing/${housingId}`,
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

    createOwner: builder.mutation<Owner, OwnerPayloadDTO>({
      query: (payload) => ({
        url: 'owners/creation',
        method: 'POST',
        body: payload
      }),
      transformResponse: (owner: OwnerDTO) => fromOwnerDTO(owner),
      invalidatesTags: () => [{ type: 'Owner', id: 'LIST' }]
    }),

    updateOwner: builder.mutation<void, OwnerPayloadDTO & Pick<Owner, 'id'>>({
      query: (payload) => ({
        url: `owners/${payload.id}`,
        method: 'PUT',
        body: payload
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Owner', id },
        { type: 'HousingOwner', id },
        'Housing',
        'Event'
      ]
    }),

    updateHousingOwners: builder.mutation<
      void,
      { housingId: string; housingOwners: HousingOwner[] }
    >({
      query: ({ housingId, housingOwners }) => ({
        url: `/housing/${housingId}/owners`,
        method: 'PUT',
        body: housingOwners
      }),
      invalidatesTags: (result, error, { housingId }) => [
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
    rawAddress: owner.rawAddress
      ? owner.rawAddress
          .filter((_: string) => _)
          .map((_: string) => toTitleCase(_))
      : [],
    fullName: toTitleCase(owner.fullName.replace(/^(MME |M )/i, '')),
    administrator: owner.administrator
      ? toTitleCase(owner.administrator)
      : undefined
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
  useFindOwnersQuery,
  useFindOwnersByHousingQuery,
  useCreateOwnerMutation,
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation
} = ownerApi;
