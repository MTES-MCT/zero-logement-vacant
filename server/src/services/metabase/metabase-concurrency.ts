import async from 'async';

import ExternalServiceUnavailableError from '~/errors/externalServiceUnavailableError';

import type { CardValue, MetabaseService } from './metabase-service';

interface ConcurrencyOptions {
  maxConcurrency: number;
  maxQueuedQueries?: number;
  maxQueueWaitMs?: number;
}

interface CardQuery {
  execute: () => Promise<CardValue>;
  started: boolean;
  timeout?: ReturnType<typeof setTimeout>;
}

const DEFAULT_MAX_QUEUED_QUERIES = 20;
const DEFAULT_MAX_QUEUE_WAIT_MS = 30_000;
const RETRY_AFTER_SECONDS = 1;

function createUnavailableError(): ExternalServiceUnavailableError {
  return new ExternalServiceUnavailableError('Metabase', {
    retryAfterSeconds: RETRY_AFTER_SECONDS
  });
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

export function createConcurrencyLimitedMetabaseService(
  inner: MetabaseService,
  options: ConcurrencyOptions
): MetabaseService {
  const maxQueuedQueries =
    options.maxQueuedQueries ?? DEFAULT_MAX_QUEUED_QUERIES;
  const maxQueueWaitMs = options.maxQueueWaitMs ?? DEFAULT_MAX_QUEUE_WAIT_MS;

  assertPositiveInteger(options.maxConcurrency, 'maxConcurrency');
  assertPositiveInteger(maxQueuedQueries, 'maxQueuedQueries');
  assertPositiveInteger(maxQueueWaitMs, 'maxQueueWaitMs');

  const cardQueries = async.queue<CardQuery, CardValue>(async (query) => {
    query.started = true;
    clearTimeout(query.timeout);
    return query.execute();
  }, options.maxConcurrency);

  function enqueue(execute: () => Promise<CardValue>): Promise<CardValue> {
    if (cardQueries.length() >= maxQueuedQueries) {
      return Promise.reject(createUnavailableError());
    }

    return new Promise<CardValue>((resolve, reject) => {
      const query: CardQuery = { execute, started: false };
      query.timeout = setTimeout(() => {
        if (query.started) return;

        cardQueries.remove(({ data }) => data === query);
        reject(createUnavailableError());
      }, maxQueueWaitMs);

      cardQueries.push<CardValue>(query, (error, value) => {
        clearTimeout(query.timeout);
        if (error) {
          reject(error);
          return;
        }
        resolve(value as CardValue);
      });
    });
  }

  return {
    fetchDashboardRaw: (id) => inner.fetchDashboardRaw(id),
    getDashboard: (id) => inner.getDashboard(id),
    findDashcard: (dashboardId, dashcardId) =>
      inner.findDashcard(dashboardId, dashcardId),
    getCardValue: (...args) => enqueue(() => inner.getCardValue(...args))
  };
}
