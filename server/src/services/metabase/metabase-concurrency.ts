import async from 'async';

import type { CardValue, MetabaseService } from './metabase-service';

interface ConcurrencyOptions {
  maxConcurrency: number;
}

type CardQuery = () => Promise<CardValue>;

export function createConcurrencyLimitedMetabaseService(
  inner: MetabaseService,
  options: ConcurrencyOptions
): MetabaseService {
  if (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1) {
    throw new RangeError('maxConcurrency must be a positive integer');
  }

  const cardQueries = async.queue<CardQuery, CardValue>(
    async (query) => query(),
    options.maxConcurrency
  );

  return {
    fetchDashboardRaw: (id) => inner.fetchDashboardRaw(id),
    getDashboard: (id) => inner.getDashboard(id),
    findDashcard: (dashboardId, dashcardId) =>
      inner.findDashcard(dashboardId, dashcardId),
    getCardValue: (...args) =>
      cardQueries.pushAsync(() => inner.getCardValue(...args))
  };
}
