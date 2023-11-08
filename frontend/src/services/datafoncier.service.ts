import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import authService from './auth.service';
import config from '../utils/config';
import { DatafoncierHousing } from '../../../shared';

export const datafoncierApi = createApi({
  reducerPath: 'datafoncierApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/datafoncier`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Datafoncier housing'],
  endpoints: (builder) => ({
    findOneHousing: builder.query<DatafoncierHousing, string>({
      query: (id: string) => `/housing/${id}`,
      providesTags: (housing, error, id) => [
        { type: 'Datafoncier housing', id },
      ],
    }),
  }),
});

export const { useLazyFindOneHousingQuery } = datafoncierApi;
