# LOVAC EETL — loader extraction & existing-housings command

**Date:** 2026-04-16
**Branch:** feat/import-lovac-owner-eetl
**Scope:** backend — `server/src/scripts/import-lovac/`
**Builds on:** `2026-04-15-lovac-eetl-housings.md` (already implemented)

## Context

The previous spec EETL-ified `source-housings` and `source-housing-owners` (enricher + transform) but kept the load step as inline `tee()` fan-outs inside each command. The earlier `source-owners` work did better: it routed all changes through a single `WritableStream` that demultiplexes by `change.type + change.kind` and maintains per-kind buffers internally — no `tee()`, one sink.

This spec generalizes that pattern to all three import pipelines and EETL-ifies the `housings/housing-processor.ts` (the "verification of existing housings" step that is currently Phase 3 of `source-housing-command.ts`), promoting it to a standalone CLI subcommand.

---

## Goals

1. **Extract the load step into named `loader` files** — one per pipeline. Each loader is a `WritableStream<XxxChange>` that demultiplexes by discriminator and owns its buffering/flushing.
2. **Eliminate `.tee()` from `source-housing-command.ts` and `source-housing-owner-command.ts`** — both end with `.pipeTo(createXxxLoader(...))`.
3. **Split `housings/housing-processor.ts`** into `housing-transform.ts` + `housing-loader.ts`, and promote the wiring into a new standalone `housing-command.ts` exposed via the CLI as `existing-housings`. (No enricher: the processor's logic is already pure synchronous and reads only fields on the housing record.)
4. **Remove Phase 3 from `source-housing-command.ts`** — verification is no longer a phase of source import; it runs as its own command.

## Non-goals

- No changes to enrichers or transforms beyond what's required to route through the new loaders.
- No changes to `source-buildings`, `history`, or shared `infra/` utilities.
- No changes to the underlying SQL or repository methods called by the loaders.
- Loader and types are **copied, not shared**, between `source-housings/` and `housings/` (deliberate — the two pipelines are independent).

---

## Naming convention

| Aspect | Convention | Example |
|---|---|---|
| File (lives in `source-*/` dir) | `source-{entity}-{role}.ts` | `source-owner-loader.ts` |
| File (lives in `housings/` dir) | `housing-{role}.ts` | `housing-loader.ts` |
| Function | `create{Entity}{Role}` (target entity, not source) | `createOwnerLoader`, `createHousingLoader`, `createHousingOwnerLoader` |
| Function (disambiguator) | when two pipelines target the same entity, prefix with the CLI subcommand qualifier | `createExistingHousingTransform`, `createExistingHousingLoader`, `createExistingHousingCommand` |

Rationale: function names reflect what the unit **produces** (target table). `createSourceOwnerLoader` would be misleading — the loader writes to `owners`, not to a source table. When both `source-housings/` and `housings/` (verification) target the `housings` table, the verification pipeline gets the `Existing` qualifier (matching its CLI subcommand `existing-housings`) to avoid the collision.

---

## Architecture

### Loader contract (per pipeline, copied not shared)

```typescript
function create{Entity}Loader(opts: {
  dryRun?: boolean;
  reporter: Reporter<Source{Entity}>;
}): WritableStream<{Entity}Change>
```

Internal shape (mirrors existing `createOwnerLoadSink` in `source-owner-command.ts:141-188`):

```typescript
const buffers: Record<Kind, Item[]> = { ... };
async function flushKind1() { ... reporter.created(n) ... }
async function flushKind2() { ... reporter.updated(n) ... }
// etc.

return new WritableStream<XxxChange>({
  async write(change) {
    await match(change)
      .with({ type: ..., kind: ... }, async (c) => {
        buffers[k].push(c.value);
        if (buffers[k].length >= CHUNK_SIZE) await flushKind1();
      })
      // ...
      .exhaustive();
  },
  async close() {
    await Promise.all([flushKind1(), flushKind2(), ...]);
  }
});
```

Each loader owns `CHUNK_SIZE` and any column allowlists (e.g., `UPSERT_COLUMNS`, the `keys` array currently in `updateHousings`).

---

## Pipeline 1 — `source-owners`

### Changes

```
source-owners/
  source-owner-loader.ts    NEW    extracts existing inline createOwnerLoadSink
  source-owner-command.ts   MODIFY remove inline sink; .pipeTo(createOwnerLoader(...))
```

### `createOwnerLoader`

Input: `OwnerChange` (= `Change<OwnerRecordDBO, 'owner'>` with `kind: 'create' | 'update'`).

Behavior: byte-for-byte port of `createOwnerLoadSink` from `source-owner-command.ts:141-188`. Constants `CHUNK_SIZE` and `UPSERT_COLUMNS` move with it.

### Command

`source-owner-command.ts` shrinks: imports `createOwnerLoader`, drops `createOwnerLoadSink`, drops the now-unused imports (`db`, `Owners`, `OwnerRecordDBO`, `ownerTable`, `match`-from-`ts-pattern`, `WritableStream` if no other use).

---

## Pipeline 2 — `source-housings`

### Changes

```
source-housings/
  source-housing-loader.ts  NEW    demultiplexer for HousingChange | HousingEventChange | AddressChange
  source-housing-command.ts MODIFY .pipeTo(createHousingLoader(...)); remove Phase 3 entirely
```

### `createHousingLoader`

Input: `HousingChange | HousingEventChange | AddressChange` (existing types from `source-housing-transform.ts`, unchanged).

Internal buffers (4):

| Buffer | Source change | Sink behavior | Flush at |
|---|---|---|---|
| `inserts` | `{ type: 'housing', kind: 'create' }` | `Housing().insert(batch)` | 1_000 |
| `updates` | `{ type: 'housing', kind: 'update' }` | `db.transaction → updateHousings(batch, { temporaryTable: 'source_housing_updates_tmp' })` (createUpdater pattern, like the current Phase 2 inline) | 1_000 |
| `events` | `{ type: 'event', kind: 'create' }` | `eventRepository.insertManyHousingEvents(batch)` | 1_000 |
| `addresses` | `{ type: 'address', kind: 'create' }` | `Addresses().insert(batch.map(formatAddressApi)).onConflict(['ref_id', 'address_kind']).ignore()` | 1_000 |

Helpers `insertHousings`, `updateHousings`, `stripReadOnlyFields` move from `source-housing-command.ts` into `source-housing-loader.ts` as private internal helpers (not re-exported).

The current Phase 2 uses `createUpdater` (a temporary-table-based bulk update). The loader's `updates` flush replicates that pattern: stage to a temporary table, bulk update, then drop the temporary table — same semantics as today, just owned by the loader instead of inline.

### Command

`source-housing-command.ts` ends up with **two** phases:

1. **Phase 1** (unchanged) — geo-code update via inline `createUpdater`. Stays as-is: it emits a single narrow change type and does not benefit from the demultiplexer.
2. **Phase 2** (rewired) — main LOVAC import. Pipeline ends with `.pipeTo(createHousingLoader({ dryRun, reporter: sourceHousingReporter }))`. The 4-way `tee()` block disappears.
3. **Phase 3 — DELETED.** The `housingRepository.stream` block, the `createHousingProcessor` call, and the second `Promise.all([...])` block all go away. The `housingReporter` variable also goes away (only used for Phase 3).

The `finally` block keeps the trigger re-enable, the `sourceHousingReporter.report()`, the `writeReport` call, and `console.timeEnd`.

---

## Pipeline 3 — `source-housing-owners`

### Changes

```
source-housing-owners/
  source-housing-owner-loader.ts  NEW    demultiplexer for HousingOwnersChange | HousingEventChange
  source-housing-owner-command.ts MODIFY .pipeTo(createHousingOwnerLoader(...))
```

### `createHousingOwnerLoader`

Input: `HousingOwnersChange | HousingEventChange` (existing types from `source-housing-owner-transform.ts`, unchanged).

Internal buffers (2):

| Buffer | Source change | Sink behavior | Flush at |
|---|---|---|---|
| `housingOwners` | `{ type: 'housingOwners', kind: 'replace' }` | per-group transactional `delete by (housing_geo_code, housing_id) → insert(group)` (mirrors current inline write at `source-housing-owner-command.ts:1962-1976` from the implemented plan) | per-write (no batching — each replace is its own transaction) |
| `events` | `{ type: 'event', kind: 'create' }` | `eventRepository.insertManyHousingEvents(batch)` | 1_000 |

Note: housing-owner replace is naturally per-group (not buffered) because the delete-key is the group's housing identifier. The events buffer batches across groups.

### Command

`source-housing-owner-command.ts`: remove the `.tee()` and the two inline writable streams; replace with a single `.pipeTo(createHousingOwnerLoader({ dryRun, reporter }))`. No other structural changes.

---

## Pipeline 4 (NEW) — `housings/` existing-housings verification

The current `housing-processor.ts` is already a pure synchronous map (no DB calls): all decision inputs (`dataFileYears`, `occupancy`, `status`, `subStatus`) are on the housing record itself. There is **no enrichment step** — splitting it requires only a transform + loader + command.

### Changes

```
housings/
  housing-transform.ts       NEW    pure fn — port of housing-processor logic, parameterized by year
  housing-loader.ts          NEW    demultiplexer for HousingUpdateChange | HousingEventChange (subset of Pipeline 2's loader)
  housing-command.ts         NEW    standalone command — wires transform + loader + handles trigger toggling, writeReport
  housing-processor.ts       DELETE
  test/housing-processor.test.ts  DELETE  (superseded by housing-transform.test.ts)
```

### CLI subcommand

Register `existing-housings` in `cli.ts`, alongside the existing `housings`, `owners`, `housing-owners`, `buildings`, `history`:

```typescript
program
  .command('existing-housings')
  .description(
    'Verify existing housings against the imported LOVAC year. Resets occupancy/status for housings missing from the file. Run after `housings`.'
  )
  .argument('<file>', 'Reserved (currently unused — verification reads from the database)')
  .addOption(abortEarly)
  .addOption(departments)
  .addOption(dryRun)
  .addOption(year)
  .action(async (_file, options) => {
    const command = createExistingHousingCommand();
    await command(options).then(() => process.exit());
  });
```

The `year` option drives the `data_file_years.includes(year)` check that distinguishes "still in this year's LOVAC" from "missing — needs reset".

### `createExistingHousingTransform`

Pure synchronous function. Signature:

```typescript
type HousingUpdateChange = Change<HousingApi, 'housing'> & { kind: 'update' };
type HousingEventChange  = Change<HousingEventApi, 'event'> & { kind: 'create' };
type ExistingHousingChange = HousingUpdateChange | HousingEventChange;

function createExistingHousingTransform(opts: {
  auth: UserApi;
  year: string;
  reporter: Reporter<HousingApi>;
  abortEarly?: boolean;
}): (housing: HousingApi) => ExistingHousingChange[];
```

Logic — direct port of `housing-processor.ts`, with `'lovac-2025'` replaced by the `year` option:

- If `housing.dataFileYears.includes(year)` → skip (return `[]`, `reporter.skipped`).
- Else if `housing.occupancy !== Occupancy.VACANT` → skip.
- Else if `isInProgress(housing)` (status = `IN_PROGRESS` and subStatus ∈ `['En accompagnement', 'Intervention publique']`) → skip.
- Else if `isCompleted(housing)` (status = `COMPLETED`) → skip.
- Else emit:
  - `{ type: 'housing', kind: 'update', value: { ...housing, occupancy: UNKNOWN, status: COMPLETED, subStatus: 'Sortie de la vacance' } }`
  - `{ type: 'event', kind: 'create', value: housing:occupancy-updated event }` (always, when not skipped — uses `OCCUPANCY_LABELS[housing.occupancy]` → `OCCUPANCY_LABELS[UNKNOWN]`)
  - `{ type: 'event', kind: 'create', value: housing:status-updated event }` (always, when not skipped — uses `HOUSING_STATUS_LABELS[housing.status]` → `HOUSING_STATUS_LABELS[COMPLETED]`)

The `isInProgress` and `isCompleted` predicates move from `housing-processor.ts` into `housing-transform.ts` (re-exported so downstream callers, if any, are unaffected — currently only the test imports them).

Event IDs use `uuidv4()` (random, non-idempotent) — preserved from the original processor. The verification command is meant to be re-runnable; idempotency is provided by the skip conditions, not by deterministic event IDs.

Input type stays `HousingApi` (not DBO) because `housingRepository.stream(...)` already returns `HousingApi`. Switching to DBO would require changing the repository, which is out of scope.

### `createExistingHousingLoader`

Input: `ExistingHousingChange`.

Internal buffers (2):

| Buffer | Source change | Sink behavior | Flush at |
|---|---|---|---|
| `updates` | `{ type: 'housing', kind: 'update' }` | values pass through `formatHousingRecordApi` then `createUpdater` (stage to `existing_housing_updates_tmp`, bulk `updateHousings`, drop temp) | 1_000 |
| `events` | `{ type: 'event', kind: 'create' }` | `eventRepository.insertManyHousingEvents(batch)` | 1_000 |

The `updateHousings` body and column allowlist are duplicated from `source-housing-loader.ts` — copy, don't share. The `formatHousingRecordApi` step is needed because the transform emits `HousingApi` values (matching the `housingRepository.stream` input type).

### `createExistingHousingCommand`

```typescript
async (options: ExecOptions): Promise<void> => {
  try {
    console.time('Verify existing housings');
    const auth = await userRepository.getByEmail(config.app.system);
    if (!auth) throw new UserMissingError(config.app.system);

    // Disable building triggers (same as source-housing-command Phase 3 setup)
    await db.raw(`ALTER TABLE fast_housing DISABLE TRIGGER ...;`);

    const total = await count(housingRepository.stream({ filters: {} }));

    await housingRepository.stream({ filters: {} })
      .pipeThrough(progress({ initial: 0, total, name: 'Verifying existing housings' }))
      .pipeThrough(map(createExistingHousingTransform({
        auth,
        year: options.year,
        reporter,
        abortEarly: options.abortEarly
      })))
      .pipeThrough(flatten())
      .pipeTo(createExistingHousingLoader({ dryRun: options.dryRun, reporter }));

    // Update building counts (same SQL as source-housing-command Phase 3 cleanup)
    await db.raw(`WITH building_counts AS (...) UPDATE buildings ...`);
  } finally {
    await db.raw(`ALTER TABLE fast_housing ENABLE TRIGGER ...;`);
    reporter.report();
    await writeReport(options, reporter);
    console.timeEnd('Verify existing housings');
  }
};
```

The `writeReport` helper writes to:
- **file mode:** `./import-lovac-{year}-existing-housings.report.json`
- **S3 mode:** `existing-housings/{year}.report.json` (fixed key — no input file to derive from)

The trigger toggling and `building_counts` SQL move out of `source-housing-command.ts` and into the new command (they were tied to Phase 3, not Phase 2).

---

## Testing

### TDD per file

| File | Test type | Coverage |
|---|---|---|
| `source-owner-loader.ts` | integration | `OwnerChange` produces correct `Owners().insert` / `onConflict-merge`; `dryRun` skips writes; `reporter.created/updated` called with batch size |
| `source-housing-loader.ts` | integration | each of 4 change kinds routes correctly; chunking + close-flush; `dryRun`; temporary-table-based update path works (knex-aware) |
| `source-housing-owner-loader.ts` | integration | per-group transactional delete+insert; events batched separately; `dryRun` |
| `housings/housing-transform.ts` | unit (no DB) | port the existing `housing-processor.test.ts` cases verbatim, parameterized by `year`; verifies skip cases (year-included, non-vacant, in-progress, completed) and the reset emission (housing update + 2 events) |
| `housings/housing-loader.ts` | integration | update + event changes route correctly; `dryRun` |
| `housings/housing-command.ts` | integration | end-to-end against seeded DB: housing missing from year is reset; housing in year is unchanged; in-progress and completed housings are preserved |

### Existing tests to update

- `source-housing-command.test.ts` — remove all Phase 3 assertions and seed data. Phase 2 assertions remain valid (loader output is observably identical to the previous tee'd output).
- `source-housing-owner-command.test.ts` — no behavior change expected; existing assertions on DB state remain valid.
- `source-owner-command.test.ts` — no behavior change expected.

### Deleted test files

- `housings/test/housing-processor.test.ts` — superseded by `housing-transform.test.ts` (logic) and `housing-command.test.ts` (integration).

---

## Implementation order

Each step ends green (tests pass) and gets its own commit.

1. **Extract `createOwnerLoader`** (pure move + rename).
2. **Extract `createHousingOwnerLoader`** (replaces 2-way `tee()`).
3. **Extract `createHousingLoader`** for Phase 2 only (replaces 4-way `tee()`; Phase 3 still calls `createHousingProcessor`).
4. **Build `housings/housing-transform.ts`** + tests (port logic from `housing-processor.ts`, parameterize year).
5. **Build `housings/housing-loader.ts`** + tests.
6. **Build `housings/housing-command.ts`** + tests; register `existing-housings` subcommand in `cli.ts`.
7. **Remove Phase 3** from `source-housing-command.ts`; delete `housings/housing-processor.ts` and its test; remove now-unused `housingReporter` variable and helpers.
8. **Verification commit** — run `yarn nx test server`; grep for orphan references to `createHousingProcessor`, `housingReporter` (in source-housing-command), or `tee()` calls in the three modified commands.

---

## Constraints

- No changes to shared `infra/` utilities.
- No changes to `source-buildings`, `history`, `source-housing-enricher`, `source-housing-transform`, `source-housing-owner-enricher`, `source-housing-owner-transform`, `source-owner-enricher`, `source-owner-transform`.
- Each loader is self-contained: types, constants (`CHUNK_SIZE`, column allowlists), and helpers stay private to its file. Cross-pipeline imports of loader internals are forbidden.
- The CLI surface gains exactly one new subcommand (`existing-housings`); existing subcommands keep their current names and arguments.
- `tee()` must not appear in any of the three modified commands or in the new `housings/housing-command.ts`.
