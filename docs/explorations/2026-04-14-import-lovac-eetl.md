# Exploration: Import LOVAC — EETL redesign

**Date:** 2026-04-14
**Status:** Exploration — decision taken (see below)

---

## Context

The `server/src/scripts/import-lovac/` pipeline imports several million rows of LOVAC
data (housings, owners, housing-owners) into production each year. This exploration
analyses the current implementation, identifies issues, and decides how to address
them — both immediately and long-term.

---

## Current pipeline analysis

### Architecture

The pipeline is built on the Web Streams API (`ReadableStream`, `TransformStream`,
`WritableStream`). The shape per entity is:

```
SourceRepository (file | S3)
  → validator (Yup schema)
  → processor  (business logic: upsert decisions, event generation)
  → fan-out via tee()
  → sinks (createUpdater → temp table → bulk UPDATE FROM, or chunkify → INSERT)
```

### What works well

- **Streaming end-to-end**: no full load into memory, natural backpressure.
- **`chunkify` + temp table for bulk updates**: efficient; single `UPDATE … FROM` instead
  of N row-by-row updates.
- **`Change<Value, Type>` discriminated union**: processors return data, not side effects.
  Caller controls batching and routing. Processors are testable without DB mocks.
- **`createUpdater` abstraction**: cleanly handles file (dry-run) vs database destinations.
- **Reporter pattern**: pass/skip/fail counters with pluggable implementations.
- **Department filtering**: allows scoped imports.
- **Dry-run support**: writes to JSONL instead of DB.
- **Good test coverage** on processors and validators.

### Issues

#### Critical

**N+1 DB queries in processors.** Every source row triggers 1–3 synchronous DB lookups:
- `sourceHousingProcessor`: `findOne` per row + `eventRepository.find` + `noteRepository.find`
  for every *existing* housing.
- `sourceOwnerProcessor`: `findOne` per row.
- `sourceHousingOwnerProcessor`: `findOne` (housing) + `find` (owners) + `findByHousing` per group.

At 3M rows, even on same-network latency (CleverCloud, ~0.5ms), that is tens of minutes
of pure DB round-trip overhead.

**Fix:** batch enrichment — `chunkify(500)` → bulk SELECT → in-memory join → pure transform.
See EETL design below.

#### Medium

**Housing command reads source file 3×.** Once for `count()`, once for geo-code updates,
once for the main import. For S3 this is 3 downloads.

**Fix:** drop the `count()` call entirely (use an indeterminate progress bar). Merge the
geo-code update pass into the main import pass (it is a housing update and can be handled
inline).

**`tee()` causes memory pressure.** The fan-out pattern:
```ts
const [a, b, c, d] = stream.tee().map(s => s.tee()).flat();
```
duplicates every item to every branch. The faster branch buffers items for the slower one.

**Fix:** replace with a **dispatcher** (demultiplexer). Each item is routed to exactly one
sink based on `change.type + change.kind`. Each sink manages its own `chunkify`:

```ts
const dispatcher = new WritableStream<Change>({
  write(change) {
    const key = `${change.type}:${change.kind}`;
    await sinks[key]?.write(change.value);
  }
});
```

No buffering, no duplicated data.

**No transactions.** The housing command runs 3 sequential phases; failure in phase 3 leaves
phases 1–2 committed. Per-batch transactions should wrap the staging insert + `UPDATE FROM`
together. Scope: Load step only — one transaction per chunk (1 000 rows), not one transaction
for the entire import.

#### Low

**Hardcoded year strings scattered across files.** `lovac-2025`, `dataYears: [2024]` appear
in `source-housing.ts`, `source-housing-processor.ts`, `source-owner-processor.ts`. Must be
updated to `lovac-2026` / `[2025]` before each annual import. Should be a single CLI option
or constant.

**Owner command does not use `createUpdater`.** It manually manages the temp table lifecycle
that `createUpdater` already encapsulates.

**`ReporterError extends Error implements Error`** — `implements Error` is redundant.

**`differentHousingOwners` guard** in `source-housing-owner-processor.ts:66` is dead code
after `groupBy` already guarantees grouping by `local_id`.

---

## Key design questions explored

### `Change<Value, Type>` vs callbacks

Callbacks passed as parameters (async visitor pattern) are viable:
```ts
callee({ entity, onCreate: async (value) => buffer.push(value) });
// caller flushes buffer
```
The async visitor is a well-established pattern (SAX parsers, DB cursor streaming).
However: backpressure requires the processor to `await` every callback, and flushing the
final partial buffer requires an explicit `done()` / `flush()` signal.

`TransformStream` + `Change<V, T>` is the standardized equivalent: `start/transform/flush`
lifecycle is part of the spec, backpressure is handled by the pipeline, and multiple sinks
are composable without touching the processor. **Keep the current approach.**

### EETL: Extract → Enrich → Transform → Load

The standard ETL "Lookup" step (Talend, Informatica) applied to streaming:

```
Extract:  SourceRepository → stream of SourceHousing
Enrich:   chunkify(500) → bulk SELECT existing → annotate each row with DB state
Transform: pure function: (SourceHousing, ExistingHousing | null) → Change[]
Load:     dispatcher → sinks (upsert housings | insert events | ...)
```

This is not a new pattern name; it is the standard ETL "lookup" step made explicit.
The name EETL is used here for clarity.

Eliminates N+1 entirely. The transform step becomes a pure function with no I/O.

### Batch update via staging table vs upsert

The staging table pattern (`INSERT into temp → UPDATE target FROM temp`) is correct for
housing updates: it supports conditional logic (30+ columns, partial overwrites). Keep it.

For owners and events, `INSERT … ON CONFLICT DO UPDATE` is simpler and sufficient — the
update is an unconditional overwrite of LOVAC fields.

### Duplicate events on restart

Per-batch transactions mean partial progress on failure. Re-running creates duplicate events.

**Fix:** UUID v5 (RFC 4122, SHA-1, deterministic) for import-generated events:
```ts
import { v5 as uuidv5 } from 'uuid';
const IMPORT_NS = '7b4e3c2a-1f5d-4e8b-9a6c-0d2f3e4b5c6a';
const id = uuidv5(`${housingId}:${type}:${importDate}`, IMPORT_NS);
```
Same housing + same transition + same import date → same UUID → `ON CONFLICT DO NOTHING`.
The `uuid` package already used supports `v5` natively.

### Parallelism per department

`fast_housing` is partitioned by department. Running per-department in parallel is safe
for housing writes (no cross-partition contention). Two constraints:

1. **Temp table name collisions**: use PostgreSQL session-level `CREATE TEMP TABLE` (scoped
   to the connection, auto-dropped on disconnect) or suffix names with the department code.
2. **Shared tables** (`owners`, `housing_owners`): concurrent writes will contend on index
   pages. Cap concurrency at 4–8 parallel departments.

Building count update must run once after all departments complete.

---

## Python / Polars / Dagster evaluation

### Polars

DataFrame library (Rust-backed). Eliminates N+1 via an in-memory join:
```python
source = pl.scan_ndjson("housings.jsonl")
existing = pl.read_database("SELECT * FROM fast_housing", conn)
enriched = source.join(existing, on="local_id", how="left")
# replaces the entire batch-enrich loop
```

### Dagster

Already in use on this project. Provides scheduling, retries, asset lineage, run history,
and monitoring — all relevant for a production annual import.

### Together

`dagster-polars` integration is first-class. The EETL pipeline maps directly to Dagster
assets. This is the standard architecture in modern data engineering.

### Decision: TypeScript now, Python later

| Concern | TypeScript fix | Python gain |
|---|---|---|
| N+1 queries | Batch enrichment with `chunkify` | Polars in-memory join (faster, simpler) |
| Orchestration | Dagster can shell out to TS script | Native Dagster assets |
| Type safety | Shared `@zerologementvacant/models` | Pydantic from Yup→JSON Schema codegen |
| Team overhead | None | One more language to own |

**Now (2026 import, 2 days):** fix only what is broken or dangerous:
1. Update hardcoded year strings (`lovac-2025` → `lovac-2026`, `[2024]` → `[2025]`).
2. Apply batch enrichment to housing and owner processors (most impactful performance fix).
3. Run on a single department first to validate.

**Short-term (next sprint):** address tee pattern, file-read-3x, transactions.
See "Next steps" below.

**Long-term:** migrate to Python + Polars + Dagster when investing in the data pipeline
infrastructure. Pre-requisite: automated Yup → JSON Schema → Pydantic type sync in CI.
Justified if LOVAC is one of several annual import pipelines — not for a single script.

---

## Next steps: TypeScript fixes

### 1. File read 3× → single pass

Drop `count()`. Remove the geo-code pre-pass; handle geo-code changes inline in the main
housing processor (it is already an `update` change). Use indeterminate progress bar
(`cli-progress` format: `{value} rows | {duration_formatted}`).

### 2. `tee()` → dispatcher

Replace the multi-tee fan-out with a single `WritableStream` router:

```ts
function createDispatcher<C extends Change<any, any>>(
  sinks: Record<string, WritableStream<any>>
): WritableStream<C> {
  const writers = Object.fromEntries(
    Object.entries(sinks).map(([k, s]) => [k, s.getWriter()])
  );
  return new WritableStream({
    async write(change) {
      await writers[`${change.type}:${change.kind}`]?.write(change.value);
    },
    async close() {
      await Promise.all(Object.values(writers).map(w => w.close()));
    }
  });
}
```

Each sink is an independent stream with its own `chunkify` and lifecycle.

### 3. Transactions in the Load step

Wrap each `UPDATE FROM` call in an explicit transaction:

```ts
async update(rows) {
  await db.transaction(async (trx) => {
    await trx(temporaryTable).insert(rows);
    await trx(housingTable)
      .update(updates)
      .updateFrom(temporaryTable)
      .where(...);
  });
}
```

Per-batch (1 000 rows) granularity. Combined with UUID v5 for events, re-running is safe.

### 4. `createCommand` factory (after EETL refactor)

The three commands share identical scaffolding. A `createCommand` factory with pluggable
`{ schema, createRepository, createProcessor, sinks }` eliminates the repetition once the
EETL shape is finalized. Design to be revisited when the TypeScript EETL rewrite begins.
