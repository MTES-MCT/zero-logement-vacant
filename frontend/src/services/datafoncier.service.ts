import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

import authService from './auth.service';
import config from '../utils/config';
import { DatafoncierHousing } from '../../../shared';
import { getURLQuery } from '../utils/fetchUtils';

export const datafoncierApi = createApi({
  reducerPath: 'datafoncierApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/datafoncier`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Datafoncier housing'],
  endpoints: (builder) => ({
    findHousing: builder.query<DatafoncierHousing[], DatafoncierHousingQuery>({
      query: (params) => `/housing${getURLQuery(params)}`,
      providesTags: () => [{ type: 'Datafoncier housing', id: 'LIST' }],
    }),
    findOneHousing: builder.query<DatafoncierHousing, string>({
      query: (id: string) => `/housing/${id}`,
      providesTags: (housing, error, id) => [
        { type: 'Datafoncier housing', id },
      ],
    }),
  }),
});

interface DatafoncierHousingQuery
  extends Record<string, string | null | undefined> {
  geoCode: string;
  address?: string;
  idpar?: string;
}

export const { useLazyFindOneHousingQuery } = datafoncierApi;
