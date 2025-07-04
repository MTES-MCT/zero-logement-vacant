import { DashboardDTO, Resource } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

interface FindOneOptions {
  id: Resource;
}

export const dashboardApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOneDashboard: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      providesTags: (_result, _error, arg) => [{ type: 'Stats', id: arg.id }]
    })
  })
});

export const { useFindOneDashboardQuery } = dashboardApi;
