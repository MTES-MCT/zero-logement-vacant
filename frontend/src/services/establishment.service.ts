import {
  EstablishmentDTO,
  EstablishmentFiltersDTO
} from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const establishmentApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findEstablishments: builder.query<
      ReadonlyArray<EstablishmentDTO>,
      EstablishmentFiltersDTO
    >({
      query: (filters) => ({
        method: 'GET',
        url: 'establishments',
        params: filters
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'Establishment' as const,
                id
              })),
              'Establishment'
            ]
          : ['Establishment']
    })
  })
});

export const { useFindEstablishmentsQuery, useLazyFindEstablishmentsQuery } =
  establishmentApi;
