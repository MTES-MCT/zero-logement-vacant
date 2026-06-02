import type {
  CardDataDTO,
  DashboardDTO,
  Resource
} from '@zerologementvacant/models';
import { zlvApi } from './api.service';

interface FindOneOptions {
  id: Resource;
}

interface FindOneCardOptions {
  did: Resource | number;
  cid: number;
}

export const dashboardApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOneDashboard: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      providesTags: (_result, _error, arg) => [{ type: 'Stats', id: arg.id }]
    }),
    findOneDashboardNext: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      providesTags: (_result, _error, arg) => [
        { type: 'Stats', id: `next-${arg.id}` }
      ]
    }),
    findOneCard: builder.query<CardDataDTO, FindOneCardOptions>({
      query: (opts) => `dashboards/${opts.did}/cards/${opts.cid}`,
      providesTags: (_result, _error, arg) => [
        { type: 'Stats', id: `${arg.did}-card-${arg.cid}` }
      ]
    })
  })
});

export const {
  useFindOneDashboardQuery,
  useFindOneDashboardNextQuery,
  useFindOneCardQuery
} = dashboardApi;
