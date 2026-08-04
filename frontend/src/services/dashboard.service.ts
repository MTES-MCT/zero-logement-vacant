import type {
  CardDataDTO,
  DashboardDTO,
  Resource
} from '@zerologementvacant/models';
import { wait } from '@zerologementvacant/utils';

import { zlvApi } from './api.service';

interface FindOneOptions {
  id: Resource;
}

interface FindOneCardOptions {
  did: Resource | number;
  cid: number;
}

const ONE_HOUR_SECONDS = 60 * 60;
const DEFAULT_CARD_RETRY_DELAY_MS = 500;
const MAX_CARD_RETRY_DELAY_MS = 2_000;

function getRetryDelayMs(response: Response | undefined): number {
  const retryAfter = response?.headers.get('Retry-After');
  if (!retryAfter) return DEFAULT_CARD_RETRY_DELAY_MS;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_CARD_RETRY_DELAY_MS);
  }
  return DEFAULT_CARD_RETRY_DELAY_MS;
}

export const dashboardApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOneDashboard: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      keepUnusedDataFor: ONE_HOUR_SECONDS,
      providesTags: (_result, _error, arg) => [{ type: 'Stats', id: arg.id }]
    }),
    findOneCard: builder.query<CardDataDTO, FindOneCardOptions>({
      queryFn: async (opts, _api, _extraOptions, baseQuery) => {
        const path = `dashboards/${opts.did}/cards/${opts.cid}`;
        let result = await baseQuery(path);

        if (result.error?.status === 502 || result.error?.status === 503) {
          await wait(getRetryDelayMs(result.meta?.response));
          result = await baseQuery(path);
        }

        if (result.error) return { error: result.error };
        return { data: result.data as CardDataDTO };
      },
      keepUnusedDataFor: ONE_HOUR_SECONDS,
      providesTags: (_result, _error, arg) => [
        { type: 'Stats', id: `${arg.did}-card-${arg.cid}` }
      ]
    })
  })
});

export const { useFindOneDashboardQuery, useFindOneCardQuery } = dashboardApi;
