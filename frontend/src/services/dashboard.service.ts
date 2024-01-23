import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import config from '../utils/config';
import authService from './auth.service';

interface FindOneOptions {
  id: Resource;
}

type Resource = 'utilisateurs' | 'etablissements';

interface Dashboard {
  url: string;
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/dashboards`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Stats'],
  endpoints: (builder) => ({
    findOneDashboard: builder.query<Dashboard, FindOneOptions>({
      query: (opts) => `/${opts.id}`,
      providesTags: (result, error, arg) => [{ type: 'Stats', id: arg.id }],
    }),
  }),
});

export const { useFindOneDashboardQuery } = dashboardApi;
