# Reference Data Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-process response cache to 5 reference data endpoints to eliminate redundant DB queries and reduce latency.

**Architecture:** A factory function `responseCache(ttl)` returns an Express `RequestHandler` backed by a `TTLCache<string, Promise<Buffer>>` keyed on `req.originalUrl`. The `Promise<Buffer>` value provides free request coalescing: concurrent cold-cache callers all await the same promise. On error (statusCode ≥ 400 or thrown), the entry is evicted so the next caller retries fresh.

**Tech Stack:** TypeScript, Express, `@isaacs/ttlcache` (already installed), Vitest, supertest

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `server/src/middlewares/responseCache.ts` | Cache middleware factory |
| Create | `server/src/middlewares/test/responseCache.test.ts` | Tests for all 4 cache behaviors |
| Modify | `server/src/infra/config.ts` | Add `referenceCache` and `establishmentCache` config blocks |
| Modify | `server/.env.example` | Document the two new env vars |
| Modify | `server/src/routers/protected.ts` | Remove `GET /precisions` |
| Modify | `server/src/routers/unprotected.ts` | Add `GET /precisions` + apply `responseCache` to 5 routes |

---

## Task 1: Write failing tests for `responseCache`

**Files:**
- Create: `server/src/middlewares/test/responseCache.test.ts`

- [ ] **Step 1.1: Create the test file with all four test cases**

```ts
// server/src/middlewares/test/responseCache.test.ts
import express from 'express';
import { constants } from 'http2';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { responseCache } from '../responseCache';

describe('responseCache', () => {
  it('returns the cached response on a cache hit without calling the handler', async () => {
    let calls = 0;
    const app = express();
    app.get('/data', responseCache(60_000), (_req, res) => {
      calls++;
      res.json({ n: calls });
    });

    await request(app).get('/data');
    const { body, status } = await request(app).get('/data');

    expect(status).toBe(constants.HTTP_STATUS_OK);
    expect(calls).toBe(1);
    expect(body).toEqual({ n: 1 });
  });

  it('re-fetches after TTL expiry', async () => {
    // TTLCache uses performance.now() internally — Vitest fake timers cannot
    // advance it. Use a short real-time TTL with a 5× wait for CI safety.
    let calls = 0;
    const app = express();
    app.get('/data', responseCache(50), (_req, res) => {
      calls++;
      res.json({ n: calls });
    });

    await request(app).get('/data');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await request(app).get('/data');

    expect(calls).toBe(2);
  });

  it('coalesces concurrent cold-cache requests into one handler call', async () => {
    let calls = 0;
    let gateResolve!: () => void;
    const gate = new Promise<void>((resolve) => {
      gateResolve = resolve;
    });

    const app = express();
    app.get('/data', responseCache(60_000), async (_req, res) => {
      calls++;
      await gate;
      res.json({ n: calls });
    });

    // Launch 3 concurrent requests, then yield so they all reach the
    // middleware before the gate opens (all share the same pending Promise).
    const reqs = Promise.all([
      request(app).get('/data'),
      request(app).get('/data'),
      request(app).get('/data'),
    ]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    gateResolve();
    await reqs;

    expect(calls).toBe(1);
  });

  it('evicts a rejected promise so the next caller retries', async () => {
    let calls = 0;
    const app = express();
    app.get('/data', responseCache(60_000), (_req, res, next) => {
      calls++;
      if (calls === 1) {
        next(new Error('boom'));
        return;
      }
      res.json({ ok: true });
    });
    app.use(
      (
        _err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        res
          .status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
          .json({ error: 'boom' });
      }
    );

    await request(app).get('/data'); // first call fails → evicts promise
    const { status } = await request(app).get('/data'); // second call retries

    expect(status).toBe(constants.HTTP_STATUS_OK);
    expect(calls).toBe(2);
  });
});
```

- [ ] **Step 1.2: Run the tests to confirm they all fail with "Cannot find module"**

```bash
yarn nx test server -- responseCache.test.ts
```

Expected output: 4 test failures, all `Error: Cannot find module '../responseCache'`.

- [ ] **Step 1.3: Commit the failing tests**

```bash
git add server/src/middlewares/test/responseCache.test.ts
git commit -m "test(server): add failing tests for responseCache middleware"
```

---

## Task 2: Implement `responseCache`

**Files:**
- Create: `server/src/middlewares/responseCache.ts`

- [ ] **Step 2.1: Create the middleware**

```ts
// server/src/middlewares/responseCache.ts
import { TTLCache } from '@isaacs/ttlcache';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function responseCache(ttl: number): RequestHandler {
  const store = new TTLCache<string, Promise<Buffer>>({ ttl });

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.originalUrl;
    const hit = store.get(key);

    if (hit !== undefined) {
      hit
        .then((body) => {
          res.set('Content-Type', 'application/json').end(body);
        })
        .catch(next);
      return;
    }

    // Cold cache: intercept res.end to capture the response body.
    let promiseResolve!: (buf: Buffer) => void;
    let promiseReject!: (err: unknown) => void;
    const promise = new Promise<Buffer>((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    store.set(key, promise);
    // Evict on rejection so the next caller retries rather than replaying the error.
    promise.catch(() => store.delete(key));

    const originalEnd = res.end.bind(res);
    (res as any).end = function (chunk?: unknown, ...args: unknown[]) {
      if (chunk != null) {
        const buf = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as string);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          promiseResolve(buf);
        } else {
          promiseReject(new Error(`HTTP ${res.statusCode}`));
        }
      } else {
        promiseResolve(Buffer.alloc(0));
      }
      return originalEnd(chunk, ...args);
    };

    next();
  };
}
```

- [ ] **Step 2.2: Run the tests — all 4 must pass**

```bash
yarn nx test server -- responseCache.test.ts
```

Expected output: `4 passed`.

- [ ] **Step 2.3: Commit**

```bash
git add server/src/middlewares/responseCache.ts
git commit -m "feat(server): implement responseCache middleware"
```

---

## Task 3: Add config entries and env vars

**Files:**
- Modify: `server/src/infra/config.ts`
- Modify: `server/.env.example`

- [ ] **Step 3.1: Add the two config blocks to `configSchema` in `config.ts`**

In the `configSchema` object, add after the `metabase` block (after line 163):

```ts
  referenceCache: z.object({
    ttlMs: z.coerce.number().int().min(0).default(600_000)
  }),
  establishmentCache: z.object({
    ttlMs: z.coerce.number().int().min(0).default(300_000)
  }),
```

- [ ] **Step 3.2: Add the raw env values to the config object at the bottom of `config.ts`**

In the raw config object passed to `configSchema.parse(...)`, add after the `metabase` entry (around line 311):

```ts
  referenceCache: {
    ttlMs: env('REFERENCE_CACHE_TTL_MS')
  },
  establishmentCache: {
    ttlMs: env('ESTABLISHMENT_CACHE_TTL_MS')
  },
```

- [ ] **Step 3.3: Add the vars to `server/.env.example`**

After the `METABASE_CACHE_TTL_MS=` line (line 80), add:

```
REFERENCE_CACHE_TTL_MS=
ESTABLISHMENT_CACHE_TTL_MS=
```

- [ ] **Step 3.4: Run config tests to confirm no regressions**

```bash
yarn nx test server -- config.test.ts
```

Expected output: all existing config tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add server/src/infra/config.ts server/.env.example
git commit -m "feat(server): add REFERENCE_CACHE_TTL_MS and ESTABLISHMENT_CACHE_TTL_MS config"
```

---

## Task 4: Move `GET /precisions` from `protected.ts` to `unprotected.ts`

The other 4 routes (`/localities`, `/localities/:geoCode`, `/establishments`, `/establishments/:id`) are already in `unprotected.ts`. Only `/precisions` needs to move.

**Files:**
- Modify: `server/src/routers/protected.ts`
- Modify: `server/src/routers/unprotected.ts`

- [ ] **Step 4.1: Remove the `/precisions` route from `protected.ts`**

In `server/src/routers/protected.ts`, remove line 192:

```ts
router.get('/precisions', precisionController.find);
```

Leave the `/housing/:id/precisions` routes in place — those remain protected (user-scoped).

- [ ] **Step 4.2: Add `precisionController` import and the route to `unprotected.ts`**

At the top of `server/src/routers/unprotected.ts`, add the import after the existing controller imports:

```ts
import precisionController from '~/controllers/precisionController';
```

At the bottom of the route list in `unprotected.ts` (before `export default router`), add:

```ts
router.get('/precisions', precisionController.find);
```

- [ ] **Step 4.3: Run the precision controller tests to confirm no regressions**

```bash
yarn nx test server -- precisionController.test.ts
```

Expected output: all existing precision tests pass.

- [ ] **Step 4.4: Commit**

```bash
git add server/src/routers/protected.ts server/src/routers/unprotected.ts
git commit -m "feat(server): move GET /precisions to unprotected router"
```

---

## Task 5: Apply `responseCache` to the 5 target routes in `unprotected.ts`

**Files:**
- Modify: `server/src/routers/unprotected.ts`

- [ ] **Step 5.1: Add imports at the top of `unprotected.ts`**

After the existing imports, add:

```ts
import config from '~/infra/config';
import { responseCache } from '~/middlewares/responseCache';
```

(`config` may already be imported — check before adding.)

- [ ] **Step 5.2: Define TTL constants just before the route definitions**

After the imports, add:

```ts
const REFERENCE_TTL = config.referenceCache.ttlMs;
const ESTABLISHMENT_TTL = config.establishmentCache.ttlMs;
```

- [ ] **Step 5.3: Apply the cache middleware to all 5 routes**

Replace the existing 5 route definitions with cache-enabled versions:

```ts
router.get(
  '/establishments',
  jwtCheck({ required: false }),
  userCheck({ required: false }),
  validatorNext.validate({
    query: schemas.establishmentFilters
  }),
  responseCache(ESTABLISHMENT_TTL),
  establishmentController.list
);

router.get(
  '/establishments/:id',
  validatorNext.validate({ params: object({ id: schemas.id }) }),
  responseCache(ESTABLISHMENT_TTL),
  establishmentController.get
);

router.get(
  '/localities',
  localityController.listLocalitiesValidators,
  validator.validate,
  responseCache(REFERENCE_TTL),
  localityController.listLocalities
);

router.get(
  '/localities/:geoCode',
  localityController.getLocalityValidators,
  validator.validate,
  responseCache(REFERENCE_TTL),
  localityController.getLocality
);

router.get('/precisions', responseCache(REFERENCE_TTL), precisionController.find);
```

> **Note:** `responseCache` is placed after validators and before the controller. This ensures invalid requests are rejected before writing a bad entry to the cache.

- [ ] **Step 5.4: Run the full server test suite**

```bash
yarn nx test server
```

Expected output: all tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add server/src/routers/unprotected.ts
git commit -m "feat(server): apply responseCache to 5 reference data endpoints"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `responseCache(ttl)` factory with `TTLCache<string, Promise<Buffer>>` → Task 2
- [x] Cache key = `req.originalUrl` → Task 2 (`const key = req.originalUrl`)
- [x] Promise coalescing for concurrent cold-cache requests → Task 2 + Task 1 test 3
- [x] Error eviction → Task 2 (`promise.catch(() => store.delete(key))`) + Task 1 test 4
- [x] `REFERENCE_CACHE_TTL_MS` (default 600_000) → Task 3
- [x] `ESTABLISHMENT_CACHE_TTL_MS` (default 300_000) → Task 3
- [x] `GET /precisions` moved to `unprotected.ts` → Task 4
- [x] `GET /establishments/:id` already in `unprotected.ts` — no move needed
- [x] `responseCache` applied to all 5 target routes → Task 5
- [x] Cache placed after validators, before controller → Task 5 (noted in step 5.3)

**Type consistency:**
- `responseCache(ttl: number): RequestHandler` — consistent across Tasks 1, 2, 5
- `REFERENCE_TTL` / `ESTABLISHMENT_TTL` — introduced in Task 5 step 5.2, used in step 5.3
- `config.referenceCache.ttlMs` / `config.establishmentCache.ttlMs` — defined in Task 3, consumed in Task 5
