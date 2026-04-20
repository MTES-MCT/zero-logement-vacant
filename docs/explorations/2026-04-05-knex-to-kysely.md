# Exploration: Knex → Kysely migration

**Date:** 2026-04-05
**Status:** Exploration — no decision taken

---

## Context

Knex (v3.1.0) is the current query builder for the API. Its main shortcoming is typing: query results are `any[]` unless manually annotated, column names are untyped strings, and complex queries (joins, unions, aggregations) carry no compile-time guarantees. This exploration evaluates migrating to Prisma or Kysely as alternatives.

---

## Scope of the current Knex usage

| Category | Count | ~LOC |
|---|---|---|
| Repositories | 31 files | ~6,400 |
| Repository tests | 18 files | ~3,000 |
| Migration files | 201 files | ~6,800 |
| Seed files | 28 files | ~2,000 |
| DB infrastructure | 3 files | ~150 |
| **Total Knex-related** | **~280 files** | **~18,000** |

### Complexity breakdown

| Repository | Complexity | Key patterns |
|---|---|---|
| `housingRepository` (1,464 LOC) | Very high | Complex joins, subqueries, lateral joins, pagination, aggregations |
| `eventRepository` (601 LOC) | High | 10-way `UNION ALL`, batch inserts, transactions |
| `ownerRepository` (667 LOC) | High | Full-text search, pagination, complex joins |
| `groupRepository` (274 LOC) | Medium | `LATERAL` joins, aggregations |
| `campaignRepository` (250 LOC) | Medium | Joins with raw `ORDER BY`, `CASE` statements |
| Other 26 repos | Low–Medium | CRUD, soft deletes, simple filters |

---

## Option 1: Prisma

### Hard problems

| Pattern | Prisma support |
|---|---|
| `UNION ALL` (eventRepository: 10 tables) | `$queryRaw` only — loses type safety |
| `LATERAL` joins (groupRepository) | `$queryRaw` only |
| PostGIS `ST_*` functions (geoRepository) | `$queryRaw` only |
| `DISTINCT ON` (groupBy helper) | Not supported |
| `unaccent()` FTS (ownerRepository) | `$queryRaw` only |
| PostgreSQL array operators (`&&`) | `$queryRaw` only |
| Bulk `onConflict().merge()` upserts | `upsert` is row-by-row only |
| `batchInsert` in transactions | `createMany` (no partial batch control) |
| `AsyncLocalStorage` transaction propagation | Full rewrite required |
| `.modify()` composable modifiers | No equivalent |

The three most business-critical repositories (`housingRepository`, `eventRepository`, `ownerRepository`) would still be predominantly raw SQL after migration — defeating the main purpose of moving to Prisma.

### Estimate

| Phase | Manual | With AI |
|---|---|---|
| Schema generation + Prisma client setup | 3–5d | 1d |
| Infrastructure (config, transactions, helpers) | 3–4d | 1d |
| Simple CRUD repos (21 files) | 5–7d | 1–2d |
| Medium complexity repos (6 files) | 5–7d | 2–3d |
| Complex repos (4 files) | 15–25d | 5–8d |
| Seed migration (28 files) | 3–5d | 1–2d |
| Test updates + regression validation | 10–15d | 3–5d |
| **Total** | **~45–70 days** | **~14–22 days** |

**Verdict:** High cost, low return. The queries where type safety matters most (the complex ones) fall back to untyped `$queryRaw`.

---

## Option 2: Kysely

Kysely is a TypeScript-first SQL query builder at v0.28.x. Pre-1.0 semver by author choice (API stability, not instability). Actively maintained, used in production at scale, with first-class PostgreSQL support.

### Hard problems

| Pattern | Kysely support | Gap vs Knex |
|---|---|---|
| `UNION ALL` | `.unionAll()` — native | None |
| `LATERAL` joins | `.innerJoinLateral()` — native, typed | Better — no raw string |
| PostGIS `ST_*` | `` sql`ST_AsGeoJson(${ref('col')})`  `` — typed fragments | Better — `ref()` is type-safe |
| `DISTINCT ON` | `.distinctOn(col)` — native | None |
| `unaccent()` FTS | `fn('upper', [fn('unaccent', [col])])` or `sql` tag | Equivalent |
| PG array operators | `` sql`${ref('col')} && ${val}` `` | Equivalent |
| Bulk `onConflict().merge()` | `.onConflict(oc => oc.columns(cols).doUpdateSet(vals))` | None |
| `batchInsert` | `.insertInto().values([...])` — no built-in chunking | Minor — need helper for very large batches |
| `AsyncLocalStorage` transactions | Same ALS pattern — `trx` is a scoped `Kysely<DB>` instance | None |
| `.modify()` composable modifiers | `.$call(fn)` — direct equivalent | None |

Every hard problem that requires `$queryRaw` in Prisma is **natively expressible in Kysely with full type inference.**

### Key Kysely features

- `Selectable<T>` / `Insertable<T>` / `Updateable<T>` — derive safe insert/update types automatically
- `InferResult<typeof query>` — extract result type from a query object
- `$assertType<T>()` — resets TypeScript's depth counter on complex chains, no runtime cost
- `CamelCasePlugin` — handles snake_case DB ↔ camelCase JS automatically
- `mergeInto()` — full typed SQL `MERGE` (WHEN MATCHED / WHEN NOT MATCHED)
- Savepoints in transactions — more capable than Knex's transaction API
- `KyselyPlugin` interface — AST-level transforms, more powerful than Knex's hook system
- `kysely/helpers/postgres` — typed `jsonArrayFrom()`, `jsonObjectFrom()` helpers

### Migration system

Kysely ships its own migration runner (`Migrator` + `FileMigrationProvider`). It is **not compatible** with Knex migrations. However, the recommended strategy is:

> Keep Knex solely for running the 201 existing migrations. Use Kysely as the query layer going forward, and add new migrations using Kysely's `Migrator` for future schema changes.

This decouples the migration system from the query layer migration — the highest-risk phase of the Prisma migration disappears entirely.

### Estimate

| Phase | Manual | With AI |
|---|---|---|
| DB type generation (`kysely-codegen` + review) | 1–2d | 0.5d |
| Infrastructure (client, transactions, helpers port) | 1–2d | 0.5d |
| Simple CRUD repos (21 files) | 3–5d | 1–1.5d |
| Medium complexity repos (6 files) | 3–4d | 1–1.5d |
| Complex repos (4 files) | 6–10d | 2–4d |
| **Migrations: keep Knex as-is** | 0.5d | 0.5d |
| Seeds (28 files) | 1–2d | 0.5–1d |
| Test updates + regression validation | 3–5d | 1–2d |
| **Total** | **~18–30 days** | **~7–11 days** |

---

## Comparison

| Dimension | Prisma | Kysely |
|---|---|---|
| Migration effort (manual) | 45–70 days | 18–30 days |
| Migration effort (with AI) | 14–22 days | 7–11 days |
| Type safety on complex queries | Partial — raw SQL escapes type system | Full — `sql` tag + `ref()` + `InferResult` |
| `UNION ALL`, `LATERAL`, `DISTINCT ON` | `$queryRaw` fallback | Native |
| Existing migrations (201 files) | Must replace or baseline | Keep as-is |
| Syntax delta from current Knex | High | Low (~1:1 API surface) |
| Transaction model change | Full rewrite | Minimal |
| `modify()` equivalence | None | `.$call()` |
| Production stability | 1.0+, stable | v0.28.x, stable in practice |

---

## Recommendation

If the decision is made to migrate, **Kysely** is the clear choice:
- ~40% the effort of Prisma
- Solves typing across *all* queries, not just CRUD
- Existing migrations are untouched
- Syntax is close enough for AI-assisted migration at scale

However, see [`2026-04-05-knex-improvements.md`](./2026-04-05-knex-improvements.md) for axes to improve the current Knex setup before committing to a migration.
