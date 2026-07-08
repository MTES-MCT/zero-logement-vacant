# ZLV Repair Harness — Design Spec

**Date:** 2026-07-08
**Status:** Approved

## Problem

The team repeatedly writes one-off scripts to bulk-correct housing data (status, sub-status, events). Each script reinvents the same scaffolding: chunking updates to stay under the Postgres parameter limit, wrapping everything in a transaction, collecting errors, providing a dry-run mechanism. The per-script logic (which housings to fix, what to change) is small; the boilerplate is large.

Two recurring use cases drive this:

1. **Business rule backfill** — historical data needs to reflect a new rule (e.g. reset housing to "Non suivi" if its campaign has no valid sending date).
2. **Bug revert** — a system bug produced incorrect data and incorrect events (e.g. a bulk update that wiped `subStatus` to null, creating wrong `housing:status-updated` events).

Bug reverts often require cleaning up the bad events as well as restoring the housing state, because downstream systems (LOVAC) read events and depend on their correctness.

## Decision: data migrations vs repair harness

**Deploy-coupled corrections** (small, predictable, bounded) stay in the existing Knex schema migration infrastructure — no new layer needed.

**Manually-triggered bulk corrections** get the repair harness described here.

## Decision: language and location

Repairs live inside `server/` as TypeScript. They reuse the application's repository layer (`housingRepository`, `eventRepository`, `startTransaction()`), types (`HousingStatus`, `HousingEventApi`), and business logic. A Python or Dagster approach would require bypassing these abstractions and writing raw SQL, losing type safety and coupling.

## Decision: imperative interface, not declarative config

Each repair is a TypeScript file implementing a typed interface (`query` + `decide`). Query conditions are always multi-conditional and diverse; a declarative DSL would quickly become an underpowered reimplementation of SQL + TypeScript. The value is in the shared scaffold, not in abstracting away the logic.

## Architecture

```
server/src/scripts/repairs/
  lib/
    types.ts        # Repair<H>, RepairAction, RepairSkip, RepairError, PlanRow
    plan.ts         # query → decide → write plan.jsonl + errors.jsonl
    apply.ts        # read plan.jsonl → chunk → transaction → commit
  index.ts          # repair registry — imports and exports all repair definitions
  cli.ts            # zlv repair subcommand (commander), reads from index.ts
  campaign-sending-date.ts
  sub-status-bug-revert.ts
  ...

server/src/bin/
  zlv.ts            # top-level zlv binary entry point, registers repair subcommand
```

Repairs are registered by adding them to `index.ts`. The CLI resolves `<name>` against this registry at runtime. Adding a new repair = create the file + add one line to `index.ts`.

The existing `fix-housing-sub-status/` script is not migrated — it predates this harness and is already deployed.

## Core interface

```typescript
interface Repair<H extends HousingApi = HousingApi> {
  name: string;
  query(): Promise<H[]>;
  decide(housing: H): RepairAction | RepairSkip | RepairError;
}

interface RepairAction {
  update?: Partial<
    Pick<HousingApi, 'status' | 'subStatus' | 'occupancy' | 'occupancyIntended'>
  >;
  createEvents?: HousingEventApi[]; // optional, must be explicitly set
  deleteEventIds?: string[]; // hard-deleted from DB
}

interface RepairSkip {
  action: 'skip';
}
interface RepairError {
  action: 'error';
  reason: string;
}
```

`Repair<H>` is generic on `H` — what `query()` returns. This lets a repair fetch housings plus associated data (events, campaigns) in a single query and receive it fully typed in `decide()`.

Example — simple field update:

```typescript
// H = HousingApi
decide(housing) {
  return { update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null } }
}
```

Example — event-aware bug revert:

```typescript
// H = HousingApi & { events: HousingEventApi[] }
decide(housing) {
  const bad = housing.events.find(e => e.nextNew.subStatus === null && e.nextOld.subStatus !== null)
  if (!bad) return { action: 'skip' }
  return { update: { subStatus: bad.nextOld.subStatus }, deleteEventIds: [bad.id] }
}
```

## CLI

The `zlv` binary is a new `commander`-based entry point in `server/`. `repair` is its first command group.

```bash
zlv repair list                          # list registered repairs
zlv repair plan <name> [--out plan.jsonl]  # generate plan + errors files
zlv repair stats <plan-file>             # summarise plan without touching DB
zlv repair apply <plan-file>             # apply atomically
```

The naming mirrors Terraform (`plan` / `apply`) to make the intent immediately clear.

## Execution flow

### `zlv repair plan <name>`

1. Load the repair definition by name.
2. Call `query()` → array of `H`.
3. For each housing, call `decide()`:
   - `RepairAction` → written to `plan.jsonl`
   - `RepairSkip` → silently omitted
   - `RepairError` → written to `errors.jsonl`
4. Print summary: N housings to update, N events to delete, N events to create, M errors.

### `zlv repair apply <plan-file>`

1. Read `plan.jsonl`.
2. Group rows by update payload (to batch housings sharing the same target state).
3. Chunk each group to 1000 housings per batch (Postgres parameter limit safety).
4. Within a single transaction:
   - `housingRepository.updateMany()` per chunk
   - `eventRepository.deleteMany(deleteEventIds)` for all deletions
   - `eventRepository.insertManyHousingEvents(createEvents)` if any
5. Print result counts. On any failure the transaction rolls back fully.

## Plan file format

`plan.jsonl` — one JSON object per line:

```jsonl
{"housingId":"abc","housingGeoCode":"75056","update":{"status":0,"subStatus":null}}
{"housingId":"def","housingGeoCode":"69123","update":{"subStatus":"Sortie de la vacance"},"deleteEventIds":["evt-1"]}
{"housingId":"ghi","housingGeoCode":"13055","update":{"status":0},"createEvents":[{"type":"housing:status-updated","nextOld":{...},"nextNew":{...}}]}
```

`errors.jsonl` — same shape plus `reason`:

```jsonl
{
  "housingId": "xyz",
  "housingGeoCode": "31000",
  "reason": "no restorable event found"
}
```

The plan file is the dry-run artifact. It is independent of the repair definition — it can be inspected with `jq`, edited, filtered, or split before `apply` is run.

## Event handling

- **Hard-delete:** bad events (produced by system bugs) are hard-deleted. They are incorrect facts, not user actions to be reversed. Compensating events are not used — downstream systems (LOVAC) read events for correctness and a compensating event would leave wrong data in place.
- **Create events:** optional and explicit. Set `createEvents` in `RepairAction` when the correction should be visible in the housing timeline (e.g. a status change that represents a real state transition). Omit for silent data fixes.
- **Soft-delete / void:** not implemented. Hard-delete is sufficient; the audit trail of what happened is in git history and the repair script itself.

## Error handling

- `plan` errors go to `errors.jsonl` for manual review; they do not block the plan run.
- `apply` runs in a single transaction. Any failure rolls back everything — no partial apply. The plan file is untouched and the run can be retried.
- Editing `plan.jsonl` before `apply` (removing rows, correcting values) is explicitly supported.

## Testing

- Each repair definition (`query` + `decide`) is unit-tested in isolation: pass a constructed housing, assert the returned `RepairAction`.
- The shared scaffold (`plan`, `apply`) has integration tests against the test DB.
- No mocking of the DB in integration tests (consistent with project testing standards).

## What this does not cover

- Streaming / incremental application for very large datasets (millions of rows). Current repair use cases are hundreds to low thousands of housings.
- Scheduled / automated execution. Repairs are always manually triggered by a developer.
- A UI for non-developers. Repairs are a developer tool.
