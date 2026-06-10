# Analysis Page Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache Metabase API responses in-process on the backend (TTL: 1h) and bump RTK Query's `keepUnusedDataFor` so the Analysis page reloads fast and Metabase isn't hit redundantly.

**Architecture:** Refactor `metabase-api.ts` to expose a single `fetchDashboardRaw` step that both `getDashboard` and `findDashcard` consume. Wrap the `MetabaseService` interface with a `CachedMetabaseService` that holds two `@isaacs/ttlcache` instances — one keyed by `dashboardId`, one keyed by `${dashboardId}:${dashcardId}:${cardId}:${establishmentId}`. Caches store the *promise* so concurrent callers coalesce; rejected promises are evicted so the next caller retries. Replace the singleton export with the cached wrapper; the only consumer (`dashboardController`) needs no changes.

**Tech Stack:** TypeScript, `@isaacs/ttlcache`, Vitest (with fake timers), Express, RTK Query.

**Spec reference:** `docs/superpowers/specs/2026-06-09-analysis-page-cache-design.md`

---

### Task 1: Add `@isaacs/ttlcache` dependency

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Add the dependency**

Run from repo root:

```bash
yarn workspace @zerologementvacant/server add @isaacs/ttlcache
```

Expected: `@isaacs/ttlcache` added to `server/package.json` `dependencies`, `yarn.lock` updated.

- [ ] **Step 2: Verify install**

Run:

```bash
yarn workspace @zerologementvacant/server why @isaacs/ttlcache
```

Expected: prints a tree showing `@isaacs/ttlcache@<version>`.

- [ ] **Step 3: Commit**

```bash
git add server/package.json yarn.lock
git commit -m "chore(server): add @isaacs/ttlcache dependency"
```

---

### Task 2: Extract `fetchDashboardRaw` in `metabase-api.ts`

The current `getDashboard` and `findDashcard` each call `GET /api/dashboard/:id` independently. Extract that fetch into a shared method exposed on the `MetabaseService` interface so it can be cached once.

**Files:**
- Modify: `server/src/services/metabase/metabase-service.ts`
- Modify: `server/src/services/metabase/metabase-api.ts`

- [ ] **Step 1: Move `MetabaseDashboardRaw` and its supporting types to the service module**

The Raw types currently live in `metabase-api.ts` (lines 25–83). Move them verbatim into `server/src/services/metabase/metabase-service.ts`, just above `DashboardData`. Cut from `metabase-api.ts`, paste into `metabase-service.ts`, and prefix each with `export`:

```ts
// Raw payload returned by `GET /api/dashboard/:id`. Exposed on the service
// contract so wrappers (cache, instrumentation) can hold the raw payload before
// normalization.
export interface MetabaseColumnSettings {
  number_style?: string;
  decimals?: number;
  suffix?: string;
  column_title?: string;
}

export interface MetabaseVisualizationSettings {
  'number.style'?: string;
  'scalar.decimals'?: number;
  'scalar.field'?: string;
  'table.columns'?: Array<{ name: string; enabled: boolean }>;
  'graph.dimensions'?: string[];
  'graph.metrics'?: string[];
  column_settings?: Record<string, MetabaseColumnSettings>;
}

export interface MetabaseCard {
  id: number;
  name: string;
  display: string;
  description: string | null;
  visualization_settings: MetabaseVisualizationSettings;
}

export interface MetabaseDashcardVisualizationSettings {
  'card.title'?: string | null;
  'number.style'?: string;
  'scalar.field'?: string;
  'table.columns'?: Array<{ name: string; enabled: boolean }>;
  'graph.dimensions'?: string[];
  'graph.metrics'?: string[];
  column_settings?: Record<string, MetabaseColumnSettings>;
}

export interface MetabaseDashcard {
  id: number;
  card_id: number | null;
  dashboard_tab_id: number | null;
  row: number;
  col: number;
  size_x: number;
  size_y: number;
  visualization_settings: MetabaseDashcardVisualizationSettings;
  card: MetabaseCard | null;
}

export interface MetabaseTab {
  id: number;
  name: string;
  position: number;
}

export interface MetabaseDashboardRaw {
  id: number;
  tabs?: MetabaseTab[];
  dashcards: MetabaseDashcard[];
  parameters?: Array<{ id: string; slug: string; type: string }>;
}

export interface MetabaseCol {
  name: string;
  display_name?: string;
  base_type?: string;
}

export interface MetabaseQueryResult {
  data: { rows: unknown[][]; cols: MetabaseCol[] };
}
```

In `metabase-api.ts`, import these from `./metabase-service` instead of redefining them locally.

- [ ] **Step 2: Add `fetchDashboardRaw` to the `MetabaseService` interface**

In `server/src/services/metabase/metabase-service.ts`, update the `MetabaseService` interface — add the method as the **first** entry:

```ts
export interface MetabaseService {
  fetchDashboardRaw(id: number): Promise<MetabaseDashboardRaw>;
  getDashboard(id: number): Promise<DashboardData>;
  findDashcard(dashboardId: number, dashcardId: number): Promise<DashcardRef | null>;
  getCardValue(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    parameters: ReadonlyArray<DashboardParameter & { value: string }>,
    valueColumn: string | null,
    labelColumn: string | null,
    cardType: CardType,
    direction: 'horizontal' | 'vertical' | null,
    format: 'number' | 'percent',
    decimals: number,
    tableColumns: ReadonlyArray<TableColumnRef> | null
  ): Promise<CardValue>;
}
```

- [ ] **Step 3: Refactor `MetabaseAPI` to use `fetchDashboardRaw` internally**

In `server/src/services/metabase/metabase-api.ts`:

1. The Metabase-prefixed type definitions (`MetabaseColumnSettings`, `MetabaseVisualizationSettings`, `MetabaseCard`, `MetabaseDashcardVisualizationSettings`, `MetabaseDashcard`, `MetabaseTab`, `MetabaseDashboardRaw`, `MetabaseCol`, `MetabaseQueryResult`) — all of lines ~25–93 — were moved out in Step 1. Delete them here.
2. Add all of those names to the imports from `./metabase-service`.
3. Replace the existing `getDashboard` and `findDashcard` methods with:

```ts
async fetchDashboardRaw(id: number): Promise<MetabaseDashboardRaw> {
  const { data } = await this.http.get<MetabaseDashboardRaw>(
    `/api/dashboard/${id}`
  );
  return data;
}

async getDashboard(id: number): Promise<DashboardData> {
  return normalizeDashboard(await this.fetchDashboardRaw(id));
}

async findDashcard(
  dashboardId: number,
  dashcardId: number
): Promise<DashcardRef | null> {
  return findDashcardRef(await this.fetchDashboardRaw(dashboardId), dashcardId);
}
```

- [ ] **Step 4: Export the normalization helpers**

The cache wrapper (Task 4) needs `normalizeDashboard` and `findDashcardRef`. In `server/src/services/metabase/metabase-api.ts`, add `export` to both declarations:

```ts
export function normalizeDashboard(raw: MetabaseDashboardRaw): DashboardData {
```

```ts
export function findDashcardRef(
  raw: MetabaseDashboardRaw,
  dashcardId: number
): DashcardRef | null {
```

- [ ] **Step 5: Typecheck and run the existing controller tests**

Run from repo root:

```bash
yarn nx typecheck server
yarn nx test server -- dashboard-api
```

Expected: typecheck passes; all 24+ tests in `dashboard-api.test.ts` still pass without modification. If anything fails, the refactor changed behavior — fix before continuing.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/metabase/
git commit -m "refactor(server): share fetchDashboardRaw between getDashboard and findDashcard"
```

---

### Task 3: Add cache config to `infra/config.ts`

Two env vars driving the cache behavior. Both default to safe production values; tests will override `ttlMs` to a small number via fake timers (no env override needed in tests).

**Files:**
- Modify: `server/src/infra/config.ts`

- [ ] **Step 1: Extend the `metabase` schema and parser**

In `server/src/infra/config.ts`:

1. In the `metabase` block of `configSchema` (around line 157), add the two fields:

```ts
metabase: z.object({
  domain: z.url().nullable().default('http://localhost:4000'),
  token: z.string().default('example-token'),
  apiToken: z.string().default('example-api-token'),
  cacheTtlMs: z.coerce.number().int().min(0).default(60 * 60 * 1000),
  cacheMaxEntries: z.coerce.number().int().min(1).default(10_000)
}),
```

2. In the env-binding object (around line 303), wire the env vars:

```ts
metabase: {
  domain: env('METABASE_DOMAIN'),
  token: env('METABASE_TOKEN'),
  apiToken: env('METABASE_API_TOKEN'),
  cacheTtlMs: env('METABASE_CACHE_TTL_MS'),
  cacheMaxEntries: env('METABASE_CACHE_MAX_ENTRIES')
},
```

3. Extend the final cast at the bottom of the file (around line 337):

```ts
metabase: {
  domain: string;
  token: string;
  apiToken: string;
  cacheTtlMs: number;
  cacheMaxEntries: number;
};
```

- [ ] **Step 2: Typecheck**

Run:

```bash
yarn nx typecheck server
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add server/src/infra/config.ts
git commit -m "feat(server): add metabase cache TTL and max-entries config"
```

---

### Task 4: Build `metabase-cache.ts` (TDD)

A `CachedMetabaseService` that implements `MetabaseService`, holds two `@isaacs/ttlcache` instances, caches promises (coalescing), and evicts rejected promises.

**Files:**
- Create: `server/src/services/metabase/metabase-cache.ts`
- Create: `server/src/services/metabase/test/metabase-cache.test.ts`

- [ ] **Step 1: Create the test file with imports and a fake-service builder**

`server/src/services/metabase/test/metabase-cache.test.ts`:

```ts
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
```

- [ ] **Step 2: Write the first failing test — TTL hit caches `fetchDashboardRaw`**

Append to the test file:

```ts
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
});
```

- [ ] **Step 3: Run the test → expect FAIL ("cannot find module")**

Run:

```bash
yarn nx test server -- metabase-cache
```

Expected: FAIL with `Failed to load url ../metabase-cache` or similar — module does not exist yet.

- [ ] **Step 4: Implement minimal `metabase-cache.ts`**

Create `server/src/services/metabase/metabase-cache.ts`:

```ts
import TTLCache from '@isaacs/ttlcache';

import {
  findDashcardRef,
  normalizeDashboard
} from './metabase-api';
import type {
  CardValue,
  DashboardData,
  DashboardParameter,
  DashcardRef,
  MetabaseDashboardRaw,
  MetabaseService,
  TableColumnRef
} from './metabase-service';
import type { CardType, TableColumnMeta } from '@zerologementvacant/models';

export interface CacheOptions {
  ttlMs: number;
  max: number;
}

async function cached<K, V>(
  store: TTLCache<K, Promise<V>>,
  key: K,
  fetch: () => Promise<V>
): Promise<V> {
  const existing = store.get(key);
  if (existing) return existing;
  const promise = fetch().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, promise);
  return promise;
}

function cardKey(
  dashboardId: number,
  dashcardId: number,
  cardId: number,
  establishmentId: string
): string {
  return `${dashboardId}:${dashcardId}:${cardId}:${establishmentId}`;
}

class CachedMetabaseService implements MetabaseService {
  private readonly dashboardCache: TTLCache<number, Promise<MetabaseDashboardRaw>>;
  private readonly cardCache: TTLCache<string, Promise<CardValue>>;

  constructor(
    private readonly inner: MetabaseService,
    opts: CacheOptions
  ) {
    this.dashboardCache = new TTLCache({ ttl: opts.ttlMs, max: opts.max });
    this.cardCache = new TTLCache({ ttl: opts.ttlMs, max: opts.max });
  }

  fetchDashboardRaw(id: number): Promise<MetabaseDashboardRaw> {
    return cached(this.dashboardCache, id, () =>
      this.inner.fetchDashboardRaw(id)
    );
  }

  async getDashboard(id: number): Promise<DashboardData> {
    return normalizeDashboard(await this.fetchDashboardRaw(id));
  }

  async findDashcard(
    dashboardId: number,
    dashcardId: number
  ): Promise<DashcardRef | null> {
    return findDashcardRef(
      await this.fetchDashboardRaw(dashboardId),
      dashcardId
    );
  }

  getCardValue(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    parameters: ReadonlyArray<DashboardParameter & { value: string }>,
    valueColumn: string | null,
    labelColumn: string | null,
    cardType: CardType,
    direction: 'horizontal' | 'vertical' | null,
    format: 'number' | 'percent',
    decimals: number,
    tableColumns: ReadonlyArray<TableColumnRef> | null
  ): Promise<CardValue> {
    const establishmentId =
      parameters.find((p) => p.slug === 'id')?.value ?? 'anonymous';
    const key = cardKey(dashboardId, dashcardId, cardId, establishmentId);
    return cached(this.cardCache, key, () =>
      this.inner.getCardValue(
        dashboardId,
        dashcardId,
        cardId,
        parameters,
        valueColumn,
        labelColumn,
        cardType,
        direction,
        format,
        decimals,
        tableColumns
      )
    );
  }

  clear(): void {
    this.dashboardCache.clear();
    this.cardCache.clear();
  }
}

export function createCachedMetabaseService(
  inner: MetabaseService,
  opts: CacheOptions
): MetabaseService & { clear: () => void } {
  return new CachedMetabaseService(inner, opts);
}

// Re-export so callers can import the type from the module they actually use.
export type { TableColumnMeta };
```

- [ ] **Step 5: Run the test → expect PASS**

Run:

```bash
yarn nx test server -- metabase-cache
```

Expected: PASS.

- [ ] **Step 6: Add the TTL-expiry test**

Append to the `describe('CachedMetabaseService.fetchDashboardRaw', …)` block:

```ts
  it('re-fetches after TTL expiry', async () => {
    const inner = genFakeService();
    const cached = createCachedMetabaseService(inner, {
      ttlMs: 60_000,
      max: 100
    });

    await cached.fetchDashboardRaw(13);
    vi.advanceTimersByTime(60_001);
    await cached.fetchDashboardRaw(13);

    expect(inner.calls.fetchDashboardRaw).toBe(2);
  });
```

Run:

```bash
yarn nx test server -- metabase-cache
```

Expected: PASS (TTLCache's `ttl` option uses the wall clock; fake timers control it).

- [ ] **Step 7: Add the coalescing test**

Append:

```ts
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
```

Run → PASS.

- [ ] **Step 8: Add the rejection-cleanup test**

Append:

```ts
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
```

Run → PASS.

- [ ] **Step 9: Add tests for `getCardValue` cache scoped by establishment**

Append (new `describe` block at file end):

```ts
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
```

Run → PASS.

- [ ] **Step 10: Add test for `getDashboard` and `findDashcard` sharing the cached raw fetch**

Append:

```ts
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
```

Run → PASS.

- [ ] **Step 11: Add `clear()` test**

Append:

```ts
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
```

Run → PASS.

- [ ] **Step 12: Final test run + typecheck**

Run:

```bash
yarn nx test server -- metabase-cache
yarn nx typecheck server
```

Expected: all 7 tests pass, typecheck clean.

- [ ] **Step 13: Commit**

```bash
git add server/src/services/metabase/metabase-cache.ts server/src/services/metabase/test/metabase-cache.test.ts
git commit -m "feat(server): add CachedMetabaseService with TTL and promise coalescing"
```

---

### Task 5: Wire the cache into the exported singleton

Replace the singleton at the bottom of `metabase-api.ts` with the cached wrapper. The controller's import stays the same.

**Files:**
- Modify: `server/src/services/metabase/metabase-api.ts`
- Modify: `server/src/controllers/test/dashboard-api.test.ts`

- [ ] **Step 1: Wrap the singleton with the cache**

In `server/src/services/metabase/metabase-api.ts`, replace the final exports at the bottom (lines ~554–562) with:

```ts
export function createMetabaseAPI(opts: MetabaseAPIOptions): MetabaseService {
  return new MetabaseAPI(opts);
}

import { createCachedMetabaseService } from './metabase-cache';

const baseMetabaseAPI = createMetabaseAPI({
  domain: config.metabase.domain,
  apiToken: config.metabase.apiToken
});

export const metabaseAPI = createCachedMetabaseService(baseMetabaseAPI, {
  ttlMs: config.metabase.cacheTtlMs,
  max: config.metabase.cacheMaxEntries
});
```

Note: this creates a circular-ish import — `metabase-api.ts` imports from `metabase-cache.ts` which imports `normalizeDashboard`/`findDashcardRef` from `metabase-api.ts`. Node handles this fine because the wrapper only uses those at call time, not at module-load time. If the typecheck flags it, move the `import { createCachedMetabaseService }` to the top of the file with the other imports.

- [ ] **Step 2: Typecheck**

Run:

```bash
yarn nx typecheck server
```

Expected: passes. If a circular-import warning appears, move the `import` line up.

- [ ] **Step 3: Run dashboard-api tests — they will now fail because the cache persists across tests**

Run:

```bash
yarn nx test server -- dashboard-api
```

Expected: at least some tests FAIL with the second invocation of the same dashboard ID returning stale data (the first nock mock was consumed; the cached promise returns it again for the second test).

If by luck all tests already pass (each uses unique IDs), proceed to Step 5 and skip Step 4.

- [ ] **Step 4: Clear the cache between dashboard-api tests**

In `server/src/controllers/test/dashboard-api.test.ts`:

1. Add to the imports near the top:

```ts
import { metabaseAPI } from '~/services/metabase/metabase-api';
```

2. Add an `afterEach` inside the top-level `describe('Dashboard API', …)` block (immediately after the existing `beforeAll`/`afterEach` setup, around line 449):

```ts
afterEach(() => {
  // Cached MetabaseService keeps promises alive across tests. Without this,
  // a cached response from one test leaks into the next.
  (metabaseAPI as unknown as { clear: () => void }).clear();
});
```

(The cast is needed because the `MetabaseService` interface doesn't declare `clear` — only the cached wrapper does.)

- [ ] **Step 5: Run dashboard-api tests again**

Run:

```bash
yarn nx test server -- dashboard-api
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/metabase/metabase-api.ts server/src/controllers/test/dashboard-api.test.ts
git commit -m "feat(server): cache metabase responses on the exported singleton"
```

---

### Task 6: Bump RTK Query `keepUnusedDataFor` on the Analysis page endpoints

**Files:**
- Modify: `frontend/src/services/dashboard.service.ts`

- [ ] **Step 1: Add `keepUnusedDataFor` to the two endpoints used by `AnalysisViewNext`**

Replace the body of `dashboardApi` in `frontend/src/services/dashboard.service.ts` with:

```ts
const ONE_HOUR_SECONDS = 60 * 60;

export const dashboardApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findOneDashboard: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      providesTags: (_result, _error, arg) => [{ type: 'Stats', id: arg.id }]
    }),
    findOneDashboardNext: builder.query<DashboardDTO, FindOneOptions>({
      query: (opts) => `dashboards/${opts.id}`,
      keepUnusedDataFor: ONE_HOUR_SECONDS,
      providesTags: (_result, _error, arg) => [
        { type: 'Stats', id: `next-${arg.id}` }
      ]
    }),
    findOneCard: builder.query<CardDataDTO, FindOneCardOptions>({
      query: (opts) => `dashboards/${opts.did}/cards/${opts.cid}`,
      keepUnusedDataFor: ONE_HOUR_SECONDS,
      providesTags: (_result, _error, arg) => [
        { type: 'Stats', id: `${arg.did}-card-${arg.cid}` }
      ]
    })
  })
});
```

Note: legacy `findOneDashboard` is intentionally left untouched (it backs the old `AnalysisView`).

- [ ] **Step 2: Typecheck + run frontend tests**

Run:

```bash
yarn nx typecheck frontend
yarn nx test frontend -- AnalysisViewNext
```

Expected: typecheck clean, AnalysisViewNext tests still pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/dashboard.service.ts
git commit -m "feat(front): keep analysis dashboard data for 1h in RTK Query cache"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Start the stack**

Run in three terminals (or use `wt`'s post-start tasks):

```bash
docker compose -f .docker/docker-compose.yml up -d
yarn workspace @zerologementvacant/server dev
yarn workspace @zerologementvacant/front dev
```

- [ ] **Step 2: Tail backend logs and capture Metabase traffic**

In the server log, watch for outbound HTTP calls to `${METABASE_DOMAIN}/api/dashboard/...`. If logs don't surface axios calls, set `LOG_LEVEL=debug` in `server/.env` or temporarily add a one-line console.log inside `MetabaseAPI.fetchDashboardRaw`.

- [ ] **Step 3: First load**

Open <http://localhost:3000>, log in, navigate to the Analysis page (resource `13-analyses`).

Expected logs: 1× `fetchDashboardRaw(13)` and N× `getCardValue` (one per card).

- [ ] **Step 4: Hard reload (Ctrl+Shift+R) within the TTL window**

Expected logs: **no new outbound Metabase calls** — the backend cache serves everything.

- [ ] **Step 5: Confirm RTK Query keeps the data after navigation**

Navigate to `/parc-de-logements`, then back to the Analysis page (soft navigation, no reload).

Expected: page renders instantly with no network calls visible in DevTools → Network tab (RTK Query serves from store).

- [ ] **Step 6: Confirm TTL re-fetch behavior (optional, slow)**

Either wait an hour, or temporarily start the server with `METABASE_CACHE_TTL_MS=5000`, reload after 6 seconds. Expected: one fresh `fetchDashboardRaw` call after the TTL elapses.

- [ ] **Step 7: Push the branch and open a PR**

```bash
git push -u origin perf/analysis-page-cache
gh pr create --title "perf: cache Metabase responses on the Analysis page" --body "$(cat <<'EOF'
## Summary
- Backend in-process TTL cache (1h, `@isaacs/ttlcache`) for Metabase dashboard layouts and card values, keyed per-establishment for card values.
- Refactored `metabase-api.ts` so `getDashboard` and `findDashcard` share a single `fetchDashboardRaw` step — the cached path now covers both.
- Bumped RTK Query `keepUnusedDataFor` to 1h on the two `AnalysisViewNext` endpoints (legacy `findOneDashboard` untouched).
- New `METABASE_CACHE_TTL_MS` (default 3 600 000) and `METABASE_CACHE_MAX_ENTRIES` (default 10 000) env vars.

## Test plan
- [ ] `yarn nx test server -- metabase-cache` — 7 unit tests pass
- [ ] `yarn nx test server -- dashboard-api` — existing controller tests still pass
- [ ] `yarn nx typecheck server frontend` — clean
- [ ] Manual: hard-reload Analysis page; backend logs show no second-call Metabase traffic within TTL
- [ ] Manual: navigate away and back within an hour; no network requests from the browser

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr edit "$(gh pr view --json number -q .number)" --add-label perf --add-assignee "@me"
```

Expected: PR URL printed. Confirm the `perf` label exists (`gh label list | grep perf`); if not, pick the closest existing label.
