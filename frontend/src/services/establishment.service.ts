import {
  EstablishmentDTO,
  EstablishmentFiltersDTO
} from '@zerologementvacant/models';
import { Establishment, fromEstablishmentDTO } from '../models/Establishment';
import { zlvApi } from './api.service';

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
    })
  })
});

export const { useFindEstablishmentsQuery, useLazyFindEstablishmentsQuery } =
  establishmentApi;
