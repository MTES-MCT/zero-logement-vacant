import config from '../utils/config';
import authService from './auth.service';
import { Locality, TaxKinds } from '../models/Locality';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

export const localityApi = createApi({
  reducerPath: 'localityApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/localities`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Locality'],
  endpoints: (builder) => ({
    listLocalities: builder.query<Locality[], string>({
      query: (establishmentId) => `?establishmentId=${establishmentId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ geoCode }) => ({
                type: 'Locality' as const,
                geoCode,
              })),
              'Locality',
            ]
          : ['Locality'],
    }),
    updateLocalityTax: builder.mutation<
      void,
      {
        geoCode: string;
        taxKind: TaxKinds;
        taxRate?: number;
      }
    >({
      query: ({ geoCode, taxKind, taxRate }) => ({
        url: `${geoCode}/tax`,
        method: 'PUT',
        body: { taxKind, taxRate },
      }),
      invalidatesTags: (result, error, { geoCode }) => [
        { type: 'Locality', geoCode },
      ],
    }),
  }),
});

export const { useListLocalitiesQuery, useUpdateLocalityTaxMutation } =
  localityApi;
