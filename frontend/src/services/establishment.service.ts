import config from '../utils/config';
import { Establishment } from '../models/Establishment';
import { createHttpService } from '../utils/fetchUtils';
import { zlvApi } from './api.service';
import {
  EstablishmentDTO,
  EstablishmentFiltersDTO
} from '@zerologementvacant/models';

const http = createHttpService('establishment', {
  host: config.apiEndpoint,
  authenticated: true,
  json: true
});

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

export const { useFindEstablishmentsQuery } = establishmentApi;

const quickSearch = async (query: string): Promise<Establishment[]> => {
  const params = new URLSearchParams({ query });
  const response = await http.get(`/api/establishments?${params}`, {
    abortId: 'search-establishment'
  });
  return response.json();
};

export const establishmentService = {
  quickSearch
};
