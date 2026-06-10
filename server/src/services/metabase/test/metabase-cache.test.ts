import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CardValue,
  DashboardData,
  DashcardRef,
  MetabaseDashboardRaw,
  MetabaseService
} from '../metabase-service';
import { createCachedMetabaseService } from '../metabase-cache';

function genRaw(id: number): MetabaseDashboardRaw {
  return {
    id,
    dashcards: [
      {
        id: 100,
        card_id: 200,
        dashboard_tab_id: null,
        row: 0,
        col: 0,
        size_x: 6,
        size_y: 3,
        visualization_settings: {},
        card: {
          id: 200,
          name: 'fake',
          display: 'scalar',
          description: null,
          visualization_settings: {}
        }
      }
    ],
    parameters: []
  };
}

function genDashcardRef(): DashcardRef {
  return {
    dashcardId: 100,
    cardId: 200,
    type: 'flat-number',
    valueColumn: null,
    labelColumn: null,
    direction: null,
    format: 'number',
    decimals: 0,
    tableColumns: null,
    dashboardParameters: []
  };
}

interface FakeService extends MetabaseService {
  calls: {
    fetchDashboardRaw: number;
    getDashboard: number;
    findDashcard: number;
    getCardValue: number;
  };
}

function genFakeService(overrides: Partial<MetabaseService> = {}): FakeService {
  const calls = {
    fetchDashboardRaw: 0,
    getDashboard: 0,
    findDashcard: 0,
    getCardValue: 0
  };
  const inner: FakeService = {
    calls,
    fetchDashboardRaw: vi.fn(async (id: number) => {
      calls.fetchDashboardRaw++;
      return genRaw(id);
    }),
    getDashboard: vi.fn(async () => {
      calls.getDashboard++;
      return { cards: [] } as DashboardData;
    }),
    findDashcard: vi.fn(async () => {
      calls.findDashcard++;
      return genDashcardRef();
    }),
    getCardValue: vi.fn(async () => {
      calls.getCardValue++;
      return 42 as CardValue;
    }),
    ...overrides
  };
  return inner;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CachedMetabaseService.fetchDashboardRaw', () => {
  it('returns cached value on second call within TTL', async () => {
    const inner = genFakeService();
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });

    await cached.fetchDashboardRaw(13);
    await cached.fetchDashboardRaw(13);

    expect(inner.calls.fetchDashboardRaw).toBe(1);
  });

  it('re-fetches after TTL expiry', async () => {
    // Real timers + a short TTL: TTLCache reads from a `performance` ref
    // captured at module load, so Vitest fake timers cannot move its clock.
    // 50ms TTL with a 250ms wait gives a 5× margin to stay reliable on busy CI.
    vi.useRealTimers();
    const inner = genFakeService();
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 50,
      max: 100
    });

    await cached.fetchDashboardRaw(13);
    await new Promise((resolve) => setTimeout(resolve, 250));
    await cached.fetchDashboardRaw(13);

    expect(inner.calls.fetchDashboardRaw).toBe(2);
  });

  it('coalesces concurrent calls into one underlying fetch', async () => {
    let resolveInner: ((v: MetabaseDashboardRaw) => void) | undefined;
    const innerPromise = new Promise<MetabaseDashboardRaw>((resolve) => {
      resolveInner = resolve;
    });
    const inner = genFakeService({
      fetchDashboardRaw: vi.fn(() => innerPromise)
    });
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });

    const [a, b, c] = [
      cached.fetchDashboardRaw(13),
      cached.fetchDashboardRaw(13),
      cached.fetchDashboardRaw(13)
    ];
    resolveInner!(genRaw(13));
    await Promise.all([a, b, c]);

    expect(inner.fetchDashboardRaw).toHaveBeenCalledTimes(1);
  });

  it('removes the cached promise on rejection so the next call retries', async () => {
    let attempt = 0;
    const inner = genFakeService({
      fetchDashboardRaw: vi.fn(async (id: number) => {
        attempt++;
        if (attempt === 1) throw new Error('boom');
        return genRaw(id);
      })
    });
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });

    await expect(cached.fetchDashboardRaw(13)).rejects.toThrow('boom');
    await expect(cached.fetchDashboardRaw(13)).resolves.toMatchObject({
      id: 13
    });

    expect(inner.fetchDashboardRaw).toHaveBeenCalledTimes(2);
  });
});

describe('CachedMetabaseService.getCardValue', () => {
  it('caches per (dashboard, dashcard, card, establishment)', async () => {
    const inner = genFakeService();
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });
    const params = [{ id: 'p1', slug: 'id', type: 'category', value: 'est-1' }];

    await cached.getCardValue(
      13, 100, 200, params, null, null, 'flat-number', null, 'number', 0, null
    );
    await cached.getCardValue(
      13, 100, 200, params, null, null, 'flat-number', null, 'number', 0, null
    );

    expect(inner.getCardValue).toHaveBeenCalledTimes(1);
  });

  it('does not share cache entries across establishments', async () => {
    const inner = genFakeService();
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });
    const p1 = [{ id: 'p1', slug: 'id', type: 'category', value: 'est-1' }];
    const p2 = [{ id: 'p1', slug: 'id', type: 'category', value: 'est-2' }];

    await cached.getCardValue(
      13, 100, 200, p1, null, null, 'flat-number', null, 'number', 0, null
    );
    await cached.getCardValue(
      13, 100, 200, p2, null, null, 'flat-number', null, 'number', 0, null
    );

    expect(inner.getCardValue).toHaveBeenCalledTimes(2);
  });
});

describe('CachedMetabaseService — shared raw fetch', () => {
  it('runs one fetchDashboardRaw for getDashboard + findDashcard on the same id', async () => {
    const inner = genFakeService();
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });

    await cached.getDashboard(13);
    await cached.findDashcard(13, 100);

    expect(inner.fetchDashboardRaw).toHaveBeenCalledTimes(1);
  });
});

describe('CachedMetabaseService.clear', () => {
  it('drops all cached entries', async () => {
    const inner = genFakeService();
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });

    await cached.fetchDashboardRaw(13);
    cached.clear();
    await cached.fetchDashboardRaw(13);

    expect(inner.fetchDashboardRaw).toHaveBeenCalledTimes(2);
  });
});
