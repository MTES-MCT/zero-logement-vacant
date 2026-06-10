# Analysis Page Cache — Design

## Problem

The new "Analyse du parc vacant" page (`AnalysisViewNext`) reloads slowly and
hammers the Metabase backend, which is not deployed for scale. Each page load
with N cards triggers ~`1 + 2N` Metabase API calls:

- 1 call for the dashboard layout (`GET /api/dashboard/:id`)
- For every card: 1 dashboard re-fetch (inside `findDashcard`) + 1 card query

There is no shared cache today. Every reload from every user re-runs every query.

## Goals

- Cut Metabase calls per page load and share results across users of the same
  establishment.
- Improve perceived reload speed for the Analysis page.

## Non-goals

- Cross-process cache (Redis): out of scope, defer until horizontal scale forces it.
- HTTP `Cache-Control` headers: defer; backend cache covers both goals.
- Replacing `memoizee` in `auth.ts`: separate concern, separate PR.

## Approach

Two changes, composable:

1. **Backend in-process TTL cache** in front of the Metabase service. Solves
   "Metabase load" and "slow F5 reload" (first user pays; everyone else hits cache).
2. **Bump RTK Query `keepUnusedDataFor`** to 1 hour. Solves
   "navigating back to the page within a session is instant".

Daily-refresh data justifies a 1-hour TTL across both layers.

## Architecture

### Backend (`server/src/services/metabase/`)

New dependency: `@isaacs/ttlcache` (TTL-primary, FIFO eviction, no LRU overhead).

#### Refactor `metabase-api.ts`

Extract the raw fetch so it's shared between dashboard and dashcard reads:

```ts
// Private to MetabaseAPI
async fetchDashboardRaw(id: number): Promise<MetabaseDashboardRaw> {
  const { data } = await this.http.get(`/api/dashboard/${id}`);
  return data;
}

async getDashboard(id: number): Promise<DashboardData> {
  return normalizeDashboard(await this.fetchDashboardRaw(id));
}

async findDashcard(dashboardId: number, dashcardId: number): Promise<DashcardRef | null> {
  return findDashcardRef(await this.fetchDashboardRaw(dashboardId), dashcardId);
}
```

After this refactor, caching `fetchDashboardRaw` deduplicates dashboard +
dashcard reads automatically.

#### New `metabase-cache.ts`

Wraps a `MetabaseService` with two TTL caches:

- **Dashboard cache**: `TTLCache<number, Promise<MetabaseDashboardRaw>>`
  keyed by `dashboardId`. Shared across all establishments (dashboard layout
  doesn't depend on the tenant).
- **Card-value cache**: `TTLCache<string, Promise<CardValue>>` keyed by
  `${dashboardId}:${dashcardId}:${cardId}:${establishmentId}`. Per-tenant.

Both caches **store the promise**, not the resolved value, which gives us free
request coalescing — when 12 cards mount at once on a cold cache, the
dashboard fetch fires once. On rejection, the entry is deleted so the next
caller retries instead of replaying the error for 1h.

```ts
async function cached<K, V>(
  cache: TTLCache<K, Promise<V>>,
  key: K,
  fetch: () => Promise<V>
): Promise<V> {
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = fetch().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, promise);
  return promise;
}
```

#### Config

Two new env vars in `server/src/infra/config.ts`:

- `METABASE_CACHE_TTL_MS` — default `3_600_000` (1h)
- `METABASE_CACHE_MAX_ENTRIES` — default `10_000` (safety cap, never expected to hit)

The exported `metabaseAPI` singleton is wrapped with the cache layer.

### Frontend (`frontend/src/services/dashboard.service.ts`)

Bump `keepUnusedDataFor` on the two endpoints used by `AnalysisViewNext`:

```ts
findOneDashboardNext: builder.query<DashboardDTO, FindOneOptions>({
  query: (opts) => `dashboards/${opts.id}`,
  keepUnusedDataFor: 60 * 60,
  providesTags: …
}),
findOneCard: builder.query<CardDataDTO, FindOneCardOptions>({
  query: (opts) => `dashboards/${opts.did}/cards/${opts.cid}`,
  keepUnusedDataFor: 60 * 60,
  providesTags: …
}),
```

The legacy `findOneDashboard` endpoint (used by the old `AnalysisView`) is left
untouched.

## Implementation order (TDD)

1. Add `@isaacs/ttlcache` to `server` workspace.
2. Refactor `metabase-api.ts` to extract `fetchDashboardRaw`. Existing tests
   must still pass.
3. Write tests for `metabase-cache.ts`:
   - TTL expiry triggers a re-fetch
   - Concurrent calls share one underlying fetch (coalescing)
   - Rejected promise is removed from cache so the next call retries
   - `max` cap evicts in FIFO order
4. Implement `metabase-cache.ts`.
5. Wire the cache wrapper into the exported `metabaseAPI` singleton.
6. Bump `keepUnusedDataFor` in `dashboard.service.ts`.
7. Manual verification: load `/parc-vacant/analyses/13-analyses`, reload, check
   Metabase isn't hit twice within the TTL.

## Risks & trade-offs

- **Staleness after PM edits a dashboard.** Up to 1h delay. Acceptable —
  warehouse refreshes daily; PM edits are infrequent and not time-sensitive.
  If this becomes a pain point, add a `POST /admin/cache/metabase` flush endpoint.
- **Per-pod cache.** Multi-instance deployments give each pod its own cache;
  redeploys clear everything. Fine at current scale.
- **Promise-coalescing rejection.** If the cached promise rejects, all
  concurrent callers see the same error. They get the same outcome they would
  have without the cache; the next call after rejection re-fetches.
- **Memory bound.** `max: 10_000` × ~5 KB ≈ 50 MB worst case. In practice
  closer to a few MB.

## Verification

- New: `server/src/services/metabase/test/metabase-cache.test.ts`
- Existing controller tests in `server/src/controllers/test/dashboard-api.test.ts`
  must continue to pass without modification.
- Manual: reload the Analysis page twice within the TTL; second load should
  produce no outbound Metabase traffic from the backend logs.
