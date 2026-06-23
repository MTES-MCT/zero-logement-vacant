# Reference Data Cache — Design

## Problem

Stable reference endpoints (`/localities`, `/establishments`, `/precisions`) are called
repeatedly by the frontend, triggering redundant Postgres queries on data that almost
never changes. This adds unnecessary load on the database and latency for end users.

## Goals

- Eliminate redundant DB queries for reference data by caching responses in-process.
- Reduce response latency for the targeted endpoints.

## Non-goals

- Cache invalidation on writes — TTL expiry alone is sufficient for reference data.
- Cross-process / Redis cache — deferred until horizontal scale requires it (same
  decision as `metabase-cache.ts`).
- Caching mutable endpoints (`/housing`, `/campaigns`, `/groups`) — separate future effort.

## Approach

Express middleware backed by `@isaacs/ttlcache` (already installed), applied only to
the 5 targeted reference endpoints. Follows the same promise-coalescing pattern
established in `metabase-cache.ts`.

## Architecture

### New middleware: `server/src/middlewares/responseCache.ts`

Factory function returning an Express `RequestHandler`:

```ts
function responseCache(ttl: number): RequestHandler;
```

Backed by a `TTLCache<string, Promise<Buffer>>`:

- **Cache key**: `req.originalUrl` — sufficient for public endpoints with no user scoping.
- **Value**: the serialized JSON response body stored as a Promise, giving free request
  coalescing. When multiple concurrent requests arrive on a cold cache, only one DB
  round-trip fires; all callers await the same Promise.
- **Error eviction**: on rejection, the entry is deleted so the next caller retries
  rather than replaying the error for the full TTL.

```
Request → responseCache → [hit]  → return cached Promise
                        → [miss] → controller → DB
                                ↑ store Promise, all concurrent callers share it
```

### Router changes

Two routes move from `protected.ts` → `unprotected.ts` (data confirmed non-sensitive):

- `GET /precisions` — global metadata labels, identical for all users
- `GET /establishments/:id` — public administrative data, no user fields in response

Cache middleware applied in `unprotected.ts`:

```ts
router.get(
  '/localities',
  responseCache(REFERENCE_TTL),
  localityController.list
);
router.get(
  '/localities/:geoCode',
  responseCache(REFERENCE_TTL),
  localityController.get
);
router.get(
  '/establishments',
  responseCache(ESTABLISHMENT_TTL),
  establishmentController.list
);
router.get(
  '/establishments/:id',
  responseCache(ESTABLISHMENT_TTL),
  establishmentController.get
);
router.get(
  '/precisions',
  responseCache(REFERENCE_TTL),
  precisionController.find
);
```

### Config (`server/src/infra/config.ts`)

Two new env vars (same convention as `METABASE_CACHE_TTL_MS`):

| Var                          | Default            | Applied to                               |
| ---------------------------- | ------------------ | ---------------------------------------- |
| `REFERENCE_CACHE_TTL_MS`     | `600_000` (10 min) | `/localities`, `/precisions`             |
| `ESTABLISHMENT_CACHE_TTL_MS` | `300_000` (5 min)  | `/establishments`, `/establishments/:id` |

### Cache key summary

| Endpoint                   | Cache key                     | TTL    |
| -------------------------- | ----------------------------- | ------ |
| `GET /localities`          | `"/localities"`               | 10 min |
| `GET /localities/:geoCode` | `"/localities/76000"` etc.    | 10 min |
| `GET /establishments`      | `"/establishments"`           | 5 min  |
| `GET /establishments/:id`  | `"/establishments/uuid"` etc. | 5 min  |
| `GET /precisions`          | `"/precisions"`               | 10 min |

## Implementation order (TDD)

1. Write tests for `responseCache.ts`:
   - Cache hit returns cached response without calling the next handler
   - TTL expiry triggers a re-fetch
   - Concurrent cold-cache requests coalesce into one handler call
   - Rejected promise is evicted so the next caller retries
2. Implement `responseCache.ts`.
3. Add `REFERENCE_CACHE_TTL_MS` and `ESTABLISHMENT_CACHE_TTL_MS` to `config.ts` and `.env.example`.
4. Move `GET /precisions` and `GET /establishments/:id` from `protected.ts` to `unprotected.ts`.
5. Apply `responseCache` middleware to the 5 target routes in `unprotected.ts`.
6. Verify: hit a reference endpoint twice within TTL, confirm no second DB query in logs.

## Risks & trade-offs

- **Stale data after admin update** — up to 10 min lag. Acceptable given mutation
  frequency. If needed, a `DELETE /admin/cache/reference` flush endpoint can be added later.
- **Per-pod cache** — each instance has its own cache; redeploys clear it. Consistent
  with the `metabase-cache.ts` trade-off already accepted.
- **Router move security surface** — removing the JWT guard from `/precisions` and
  `GET /establishments/:id` is intentional. Both were confirmed to return non-sensitive
  public data only.

## Migration path to Redis

The `TTLCache` instance is internal to `responseCache.ts`. Swapping to Redis later
requires changing one file; routes and controllers are untouched.
