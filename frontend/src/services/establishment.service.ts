import config from '../utils/config';
import { Establishment } from '../models/Establishment';
import { EstablishmentFilterApi } from '../../../server/models/EstablishmentFilterApi';
import {
  createHttpService,
  getURLSearchParams,
  normalizeUrlSegment,
} from '../utils/fetchUtils';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

const http = createHttpService('establishment', {
  host: config.apiEndpoint,
  authenticated: true,
  json: true,
});

export const establishmentApi = createApi({
  reducerPath: 'establishmentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/establishments`,
  }),
  tagTypes: ['Establishment'],
  endpoints: (builder) => ({
    findOneEstablishment: builder.query<Establishment, EstablishmentFilterApi>({
      query: (filters) =>
        `?${getURLSearchParams({
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
    findEstablishments: builder.query<Establishment[], EstablishmentFilterApi>({
      query: (filters) =>
        `?${getURLSearchParams({
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
