import config from '../utils/config';
import { Establishment } from '../models/Establishment';
import {
  createHttpService,
  getURLQuery,
  normalizeUrlSegment,
} from '../utils/fetchUtils';
import { zlvApi } from './api.service';

const http = createHttpService('establishment', {
  host: config.apiEndpoint,
  authenticated: true,
  json: true,
});

export const establishmentApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    // TODO: `any` should be `EstablishmentFiltersDTO`
    findOneEstablishment: builder.query<Establishment, any>({
      query: (filters) =>
        `establishments/${getURLQuery({
          ...filters,
          name: filters.name ? normalizeUrlSegment(filters.name) : undefined,
        })}`,
      transformResponse: (result: Establishment[]) => result[0],
      providesTags: (result) =>
        result
          ? [
              {
                type: 'Establishment' as const,
                id: result.id,
              },
            ]
          : [],
    }),
    // TODO: `any` should be `EstablishmentFiltersDTO`
    findEstablishments: builder.query<Establishment[], any>({
      query: (filters) =>
        `establishments/${getURLQuery({
          ...filters,
          name: filters.name ? normalizeUrlSegment(filters.name) : undefined,
        })}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'Establishment' as const,
                id,
              })),
              'Establishment',
            ]
          : ['Establishment'],
    }),
  }),
});

export const { useFindOneEstablishmentQuery, useFindEstablishmentsQuery } =
  establishmentApi;

const quickSearch = async (query: string): Promise<Establishment[]> => {
  const params = new URLSearchParams({ query });
  const response = await http.get(`/api/establishments?${params}`, {
    abortId: 'search-establishment',
  });
  return response.json();
};

export const establishmentService = {
  quickSearch,
};
