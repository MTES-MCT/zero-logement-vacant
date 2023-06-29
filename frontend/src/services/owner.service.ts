import config from '../utils/config';
import authService from './auth.service';
import { DraftOwner, HousingOwner, Owner } from '../models/Owner';
import { parseISO } from 'date-fns';
import { toTitleCase } from '../utils/stringUtils';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import { PaginatedResult } from '../models/PaginatedResult';

export const ownerApi = createApi({
  reducerPath: 'ownerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/owners`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Owner', 'HousingOwner'],
  endpoints: (builder) => ({
    getOwner: builder.query<Owner, string>({
      query: (ownerId) => ownerId,
      transformResponse: (o) => parseOwner(o),
      providesTags: (result) =>
        result
          ? [
              {
                type: 'Owner' as const,
                id: result.id,
              },
            ]
          : [],
    }),
    findOwners: builder.query<
      PaginatedResult<Owner>,
      { q: string; page: number; perPage: number }
    >({
      query: ({ q, page, perPage }) => ({
        url: '',
        method: 'POST',
        body: { q, page, perPage },
      }),
      providesTags: () => ['Owner'],
      transformResponse: (response: any) => {
        return {
          ...response,
          entities: response.entities.map((e: any) => parseOwner(e)),
        };
      },
    }),
    findOwnersByHousing: builder.query<HousingOwner[], string>({
      query: (housingId) => `/housing/${housingId}`,
      providesTags: () => ['HousingOwner'],
      transformResponse: (response: any[]) =>
        response.map((_) => parseHousingOwner(_)),
    }),
    createOwner: builder.mutation<Owner, DraftOwner>({
      query: (draftOwner) => ({
        url: 'creation',
        method: 'POST',
        body: draftOwner,
      }),
      transformResponse: (result: any) => parseOwner(result),
    }),
    updateOwner: builder.mutation<void, Owner>({
      query: (owner) => ({
        url: owner.id,
        method: 'PUT',
        body: owner,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Owner', id }],
    }),
    updateHousingOwners: builder.mutation<
      void,
      { housingId: string; housingOwners: HousingOwner[] }
    >({
      query: ({ housingId, housingOwners }) => ({
        url: `housing/${housingId}`,
        method: 'PUT',
        body: housingOwners,
      }),
      invalidatesTags: (result, error, { housingId }) => [
        { type: 'HousingOwner', housingId },
      ],
    }),
  }),
});

export const parseOwner = (o: any): Owner => ({
  ...o,
  rawAddress: o.rawAddress
    ? o.rawAddress.filter((_: string) => _).map((_: string) => toTitleCase(_))
    : '',
  birthDate: o.birthDate ? parseISO(o.birthDate) : undefined,
  fullName: toTitleCase(o.fullName.replace(/^(MME |M )/i, '')),
  administrator: o.administrator ? toTitleCase(o.administrator) : undefined,
});

export const parseHousingOwner = (o: any): HousingOwner => ({
  ...o,
  ...parseOwner(o),
  startDate: o.startDate ? parseISO(o.startDate) : undefined,
  endDate: o.endDate ? parseISO(o.endDate) : undefined,
});

export const {
  useGetOwnerQuery,
  useFindOwnersQuery,
  useFindOwnersByHousingQuery,
  useCreateOwnerMutation,
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation,
} = ownerApi;
