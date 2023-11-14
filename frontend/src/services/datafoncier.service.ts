import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import fp from 'lodash/fp';

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
    findHousing: builder.query<DatafoncierHousing[], DatafoncierHousingQuery>({
      query: (params) => `/housing${createQuery(params)}`,
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

// Duplicated because we cannot import shared in frontend yet...
function createQuery(
  params: Record<string, string | null | undefined>
): string {
  return fp.pipe(
    // Faster than fp.omitBy
    fp.pickBy((value) => !fp.isNil(value)),
    (params: Record<string, string>) => new URLSearchParams(params),
    (params) => (fp.size(params) > 0 ? `?${params}` : '')
  )(params);
}

interface DatafoncierHousingQuery
  extends Record<string, string | null | undefined> {
  geoCode: string;
  address?: string;
  idpar?: string;
}

export const { useLazyFindOneHousingQuery } = datafoncierApi;
