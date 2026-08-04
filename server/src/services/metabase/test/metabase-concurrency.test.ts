import { describe, expect, it, vi } from 'vitest';

import { createConcurrencyLimitedMetabaseService } from '../metabase-concurrency';
import type { CardValue, MetabaseService } from '../metabase-service';

function getCardValue(service: MetabaseService, cardId: number) {
  return service.getCardValue(
    38,
    cardId,
    cardId,
    [],
    null,
    null,
    'flat-number',
    null,
    'number',
    0,
    null
  );
}

describe('ConcurrencyLimitedMetabaseService', () => {
  it('runs at most the configured number of card queries at once', async () => {
    const releases: Array<() => void> = [];
    let active = 0;
    let maxActive = 0;
    let started = 0;
    const inner: MetabaseService = {
      fetchDashboardRaw: vi.fn(),
      getDashboard: vi.fn(),
      findDashcard: vi.fn(),
      getCardValue: vi.fn(async () => {
        active++;
        started++;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>((resolve) => releases.push(resolve));
        active--;
        return 42 as CardValue;
      })
    };
    const limited = createConcurrencyLimitedMetabaseService(inner, {
      maxConcurrency: 2
    });

    const requests = [1, 2, 3, 4, 5].map((cardId) =>
      getCardValue(limited, cardId)
    );
    await vi.waitFor(() => expect(started).toBe(2));

    releases.shift()?.();
    releases.shift()?.();
    await vi.waitFor(() => expect(started).toBe(4));

    releases.shift()?.();
    releases.shift()?.();
    await vi.waitFor(() => expect(started).toBe(5));

    releases.shift()?.();
    await Promise.all(requests);

    expect(maxActive).toBe(2);
  });

  it('continues queued card queries after one fails', async () => {
    const inner: MetabaseService = {
      fetchDashboardRaw: vi.fn(),
      getDashboard: vi.fn(),
      findDashcard: vi.fn(),
      getCardValue: vi
        .fn()
        .mockRejectedValueOnce(new Error('Metabase unavailable'))
        .mockResolvedValueOnce(42 as CardValue)
    };
    const limited = createConcurrencyLimitedMetabaseService(inner, {
      maxConcurrency: 1
    });

    const first = getCardValue(limited, 1);
    const second = getCardValue(limited, 2);

    await expect(first).rejects.toThrow('Metabase unavailable');
    await expect(second).resolves.toBe(42);
    expect(inner.getCardValue).toHaveBeenCalledTimes(2);
  });

  it('rejects new card queries when the waiting queue is full', async () => {
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const inner: MetabaseService = {
      fetchDashboardRaw: vi.fn(),
      getDashboard: vi.fn(),
      findDashcard: vi.fn(),
      getCardValue: vi.fn(async () => {
        started.resolve();
        await release.promise;
        return 42 as CardValue;
      })
    };
    const limited = createConcurrencyLimitedMetabaseService(inner, {
      maxConcurrency: 1,
      maxQueuedQueries: 1,
      maxQueueWaitMs: 10_000,
      retryAfterSeconds: 7
    });

    const running = getCardValue(limited, 1);
    await started.promise;
    const queued = getCardValue(limited, 2);

    await expect(getCardValue(limited, 3)).rejects.toMatchObject({
      name: 'ExternalServiceUnavailableError',
      status: 503,
      headers: { 'Retry-After': '7' }
    });
    expect(inner.getCardValue).toHaveBeenCalledTimes(1);

    release.resolve();
    await expect(running).resolves.toBe(42);
    await expect(queued).resolves.toBe(42);
  });

  it('expires queued card queries before they reach Metabase', async () => {
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const inner: MetabaseService = {
      fetchDashboardRaw: vi.fn(),
      getDashboard: vi.fn(),
      findDashcard: vi.fn(),
      getCardValue: vi.fn(async () => {
        started.resolve();
        await release.promise;
        return 42 as CardValue;
      })
    };
    const limited = createConcurrencyLimitedMetabaseService(inner, {
      maxConcurrency: 1,
      maxQueuedQueries: 1,
      maxQueueWaitMs: 20
    });

    const running = getCardValue(limited, 1);
    await started.promise;
    const queued = getCardValue(limited, 2);

    await expect(queued).rejects.toMatchObject({
      name: 'ExternalServiceUnavailableError',
      status: 503
    });

    const replacement = getCardValue(limited, 3);
    release.resolve();
    await expect(running).resolves.toBe(42);
    await expect(replacement).resolves.toBe(42);
    expect(inner.getCardValue).toHaveBeenCalledTimes(2);
  });

  it('waits 30 seconds by default before expiring a queued card query', async () => {
    vi.useFakeTimers();
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const inner: MetabaseService = {
      fetchDashboardRaw: vi.fn(),
      getDashboard: vi.fn(),
      findDashcard: vi.fn(),
      getCardValue: vi.fn(async () => {
        started.resolve();
        await release.promise;
        return 42 as CardValue;
      })
    };
    const limited = createConcurrencyLimitedMetabaseService(inner, {
      maxConcurrency: 1
    });

    try {
      const running = getCardValue(limited, 1);
      await started.promise;
      const queued = getCardValue(limited, 2);
      let state: 'pending' | 'rejected' = 'pending';
      void queued.catch(() => {
        state = 'rejected';
      });

      await vi.advanceTimersByTimeAsync(29_999);

      expect(state).toBe('pending');
      expect(inner.getCardValue).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);

      await expect(queued).rejects.toMatchObject({
        name: 'ExternalServiceUnavailableError',
        status: 503
      });

      release.resolve();
      await expect(running).resolves.toBe(42);
    } finally {
      release.resolve();
      vi.useRealTimers();
    }
  });
});
