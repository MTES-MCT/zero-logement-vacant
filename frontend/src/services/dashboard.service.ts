import { zlvApi } from './api.service';

interface FindOneOptions {
  id: Resource;
}

type Resource = '6-utilisateurs-de-zlv-sur-votre-structure' | '7-autres-structures-de-votre-territoires-inscrites-sur-zlv';

interface Dashboard {
  url: string;
}

export const dashboardApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOneDashboard: builder.query<Dashboard, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      providesTags: (result, error, arg) => [{ type: 'Stats', id: arg.id }],
    }),
  }),
});

export const { useFindOneDashboardQuery } = dashboardApi;
