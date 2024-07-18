import { Locality, TaxKinds } from '../models/Locality';
import { zlvApi } from './api.service';

export const localityApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    listLocalities: builder.query<Locality[], string>({
      query: (establishmentId) =>
        `localities?establishmentId=${establishmentId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ geoCode, }) => ({
                type: 'Locality' as const,
                geoCode,
              })),
              'Locality'
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
      query: ({ geoCode, taxKind, taxRate, }) => ({
        url: `localities/${geoCode}/tax`,
        method: 'PUT',
        body: { taxKind, taxRate, },
      }),
      invalidatesTags: (result, error, { geoCode, }) => [
        { type: 'Locality', geoCode, }
      ],
    }),
  }),
});

export const { useListLocalitiesQuery, useUpdateLocalityTaxMutation, } =
  localityApi;
