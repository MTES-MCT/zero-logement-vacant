import type {
  EstablishmentDTO,
  EstablishmentFiltersDTO
} from '@zerologementvacant/models';

import {
  type Establishment,
  fromEstablishmentDTO
} from '~/models/Establishment';
import { zlvApi } from '~/services/api.service';

export const establishmentApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findEstablishments: builder.query<
      ReadonlyArray<Establishment>,
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
          : ['Establishment'],
      transformResponse: (establishments: ReadonlyArray<EstablishmentDTO>) =>
        establishments.map(fromEstablishmentDTO)
    }),
    getEstablishment: builder.query<Establishment, Establishment['id']>({
      query: (id) => `establishments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Establishment', id }],
      transformResponse: (establishment: EstablishmentDTO) =>
        fromEstablishmentDTO(establishment)
    })
  })
});

export const {
  useGetEstablishmentQuery,
  useFindEstablishmentsQuery,
  useLazyFindEstablishmentsQuery
} = establishmentApi;
