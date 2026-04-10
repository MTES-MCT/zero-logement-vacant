# Exploration: Improving the current Knex setup

**Date:** 2026-04-05
**Status:** Exploration — no decision taken
**Related:** [`2026-04-05-knex-to-kysely.md`](./2026-04-05-knex-to-kysely.md)

---

## Is migration to Kysely necessary?

No — not immediately. The core pain (lack of typing) can be addressed in layers without touching 280 files. The improvements below are ordered from highest return on investment to lowest. Each is independent and can be applied incrementally.

---

## Axis 1: Type generation from the schema (highest impact)

**Problem:** Query results are untyped (`any[]`) unless manually annotated. Column name typos are invisible at compile time.

**Solution:** Use [`kysely-codegen`](https://github.com/RobinBlomberg/kysely-codegen) or a simpler tool like [`pg-to-ts`](https://github.com/danvk/pg-to-ts) to generate TypeScript interfaces directly from the live database schema.

```bash
# kysely-codegen — reads the DB and outputs a Database interface
npx kysely-codegen --dialect=postgres --out-file=server/src/infra/database/db.d.ts
```

The generated `Database` interface can be used with Knex's generic support:

```typescript
// Before (today)
const rows = await db('housings').select('*');
// rows: any[]

// After
import type { HousingDBO } from '~/infra/database/db';
const rows = await db<HousingDBO>('housings').select('*');
// rows: HousingDBO[]
```

Knex supports `Knex.CompositeTableType<TBase, TInsert, TUpdate>` to differentiate types for SELECT vs INSERT vs UPDATE — catching common bugs where you try to insert a generated column.

**Effort:** 1–2 days to set up generation, 3–5 days to annotate all repositories.
**Return:** Eliminates most column-name typos and incorrect result access at the cost of zero query changes.

**Note:** This is also the prerequisite step for a future Kysely migration — `kysely-codegen` generates a `Database` interface usable directly with Kysely.

---

## Axis 2: Automatic camelCase ↔ snake_case (eliminate manual mapping)

**Problem:** The current `where()` helper manually converts camelCase property names to snake_case using Effect's `camelToSnake`. This is error-prone and means every new repository method must remember to apply the conversion.

```typescript
// Current — manual, error-prone
export function where<T extends object>(props: Array<keyof T>, opts?: WhereOptions) {
  return (values: T): Record<string, unknown> => {
    // ... manual camelToSnake conversion
  };
}
```

**Solution:** Configure Knex's `wrapIdentifier` and `postProcessResponse` hooks in `knexfile.ts`:

```typescript
import { camelToSnake, snakeToCamel } from 'effect/String';

const knexConfig: Knex.Config = {
  // ... existing config
  wrapIdentifier: (value, origImpl) => origImpl(camelToSnake(value)),
  postProcessResponse: (result) => {
    if (Array.isArray(result)) {
      return result.map(deepCamelCaseKeys);
    }
    return deepCamelCaseKeys(result);
  }
};
```

This makes the entire codebase speak camelCase JavaScript while the DB stays snake_case — no per-query mapping needed.

**Effort:** 1 day to implement + careful regression testing (affects all repositories).
**Risk:** Medium — postProcessResponse touches every query result. Requires thorough test coverage before enabling.

---

## Axis 3: Query tracing and slow-query detection

**Problem:** No visibility into which queries are slow or how many queries fire per request.

**Solution:** Knex provides `query`, `query-response`, and `query-error` events on the connection:

```typescript
db.on('query', (query) => {
  logger.debug({ sql: query.sql, bindings: query.bindings }, 'query:start');
});

db.on('query-response', (response, query) => {
  const ms = Date.now() - query.__startTime;
  if (ms > 500) {
    logger.warn({ sql: query.sql, ms }, 'slow query');
  }
});
```

Can also integrate with OpenTelemetry via `knex-opentelemetry` if tracing is set up.

**Effort:** Half a day.
**Return:** Immediate observability — surfaces N+1 patterns and slow queries in staging.

---

## Axis 4: Connection pool validation (`afterCreate` hook)

**Problem:** The pool `min: 0` configuration means connections are created on demand. A bad connection can enter the pool silently and cause intermittent errors.

**Solution:**

```typescript
pool: {
  min: 0,
  max: config.db.pool.max,
  afterCreate: (conn, done) => {
    conn.query('SELECT 1', (err) => done(err, conn));
  }
}
```

**Effort:** 30 minutes.
**Return:** Eliminates a class of intermittent connection errors.

---

## Axis 5: `withinTransaction` signature improvement

**Problem:** The current `withinTransaction` signature forces repositories to accept a `transaction` parameter even when no transaction is active. This leaks infrastructure concerns into the repository interface.

```typescript
// Current — transaction propagates via ALS but withinTransaction still takes a callback
export async function withinTransaction(
  cb: (transaction: Knex.Transaction) => AsyncOrSync<void>
): Promise<void>
```

The `startTransaction` / `getTransaction` ALS pattern is already good. The gap is that `withinTransaction` can create a new transaction internally when called without an active one — which can mask missing `startTransaction` calls in controllers.

**Potential improvement:** Add a stricter `requireTransaction()` helper for repository methods that *must* run inside a controller-initiated transaction, making accidental standalone use a runtime error.

**Effort:** Half a day.
**Return:** Catches transaction misuse earlier (at repository call time, not at DB error time).

---

## Summary

| Axis | Effort | Risk | Return |
|---|---|---|---|
| 1. Type generation | 3–7d | Low | High — typed results everywhere |
| 2. Auto camelCase ↔ snake_case | 1d + regression | Medium | Medium — eliminates `where()` helper |
| 3. Query tracing / slow-query detection | 0.5d | Low | High — immediate observability |
| 4. Connection pool `afterCreate` | 0.5d | Low | Low — defensive hardening |
| 5. `withinTransaction` strictness | 0.5d | Low | Low — better misuse detection |

**Recommendation:** Axes 1 and 3 are the best immediate investments. Axis 1 addresses the root typing problem and is a natural stepping stone if a Kysely migration is decided later. Axis 3 is zero-risk and provides immediate production value.

Axes 2, 4, and 5 are refinements worth doing but not urgent.
