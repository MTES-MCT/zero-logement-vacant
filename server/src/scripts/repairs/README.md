# Repairs

A CLI for **bulk, one-off repairs of housing data**: fixing a status that a
migration got wrong, restoring events a bad batch deleted, resetting a
sub-status, etc.

The design separates **deciding what to do** from **doing it**, in three steps:

```
query + decide  →  plan.jsonl        (read-only, no DB writes)
                →  review by hand     (diff, count, sanity-check)
apply           →  single transaction (atomic, rolls back on any failure)
```

You always inspect the plan before touching the database, and every apply runs
in one transaction — either the whole repair lands or nothing does.

## Commands

Run from the `server` workspace via the `zlv` entrypoint:

```bash
# List registered repairs
yarn workspace @zerologementvacant/server zlv repair list

# Generate plan.jsonl, skipped.jsonl, errors.jsonl (no DB writes)
yarn workspace @zerologementvacant/server zlv repair plan <name> --out ./tmp

# Summarise a plan file without touching the DB
yarn workspace @zerologementvacant/server zlv repair stats ./tmp/plan.jsonl

# Apply a plan file atomically
yarn workspace @zerologementvacant/server zlv repair apply <name> ./tmp/plan.jsonl

# ...forcing the count-trigger bypass on (or off) for this run
yarn workspace @zerologementvacant/server zlv repair apply <name> ./tmp/plan.jsonl --bypass-triggers
yarn workspace @zerologementvacant/server zlv repair apply <name> ./tmp/plan.jsonl --no-bypass-triggers
```

`apply` takes the repair `<name>` as well as the plan file: the name resolves
the repair so its `bypassTriggers` default can be honoured (see
[Large repairs](#large-repairs-bypassing-count-triggers)).

`plan` writes three JSONL files to `--out` (defaults to the current directory):

| File            | Contents                                                     |
| --------------- | ------------------------------------------------------------ |
| `plan.jsonl`    | Rows to apply — one housing per line, with its update/events |
| `skipped.jsonl` | Housings the repair chose not to touch                       |
| `errors.jsonl`  | Housings the repair could not decide, with a `reason`        |

Only `plan.jsonl` is fed to `apply`. Keep all three: `skipped`/`errors` are the
audit trail for what was left out.

## Writing a repair

A repair is a plain object implementing the `Repair` interface
([`lib/types.ts`](lib/types.ts)):

```ts
import type { Repair } from '../lib/types';

export const myRepair: Repair = {
  name: 'my-repair',
  // Pull the housings in scope from the DB.
  query: () => housingRepository.find({ filters: { /* ... */ } }),
  // Decide, per housing, what to do — pure, no side effects.
  decide: (housing) => {
    if (/* nothing to do */) {
      return { action: 'skip' };
    }
    if (/* cannot decide safely */) {
      return { action: 'error', reason: 'no restorable event' };
    }
    return {
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
      deleteEventIds: [/* event ids */],
      createEvents: [/* HousingEventApi[] */]
    };
  }
};
```

- `query()` returns the candidate housings.
- `decide(housing)` returns exactly one of:
  - a `RepairAction` — an optional field `update`, plus optional
    `deleteEventIds` / `createEvents`;
  - `{ action: 'skip' }` — leave the housing untouched;
  - `{ action: 'error', reason }` — flag it for manual follow-up.

`decide` must stay **pure**: no DB writes, no I/O. All side effects happen in
`apply`, which lets `plan` be a safe read-only dry run.

### Needing related data in `decide`

When a decision depends on other entities (a housing's events, its owner, a
value from an external API), **do not fetch inside `decide`** — that would break
its purity and make `plan` do per-housing I/O (N+1). Instead, fetch in bulk
inside `query()` and attach the result to each item. The `H extends HousingApi`
generic on `Repair` exists for exactly this:

```ts
interface HousingWithEvents extends HousingApi {
  statusEvents: EventUnion<'housing:status-updated'>[];
}

export const restoreStatus: Repair<HousingWithEvents> = {
  name: 'restore-status',

  async query() {
    const housings = await housingRepository.find({
      filters: {
        /* ... */
      }
    });

    // ONE bulk fetch for all housings — never one call per housing
    const events = await eventRepository.find({
      filters: {
        types: ['housing:status-updated'],
        housings: housings.map(({ id, geoCode }) => ({ id, geoCode }))
      }
    });
    const byHousing = groupBy(events, (event) => event.housingId);

    return housings.map((housing) => ({
      ...housing,
      statusEvents: byHousing[housing.id] ?? []
    }));
  },

  // pure: reads housing.statusEvents, no I/O
  decide: (housing) => {
    const restorable = housing.statusEvents.find(/* ... */);
    if (!restorable) return { action: 'error', reason: 'no restorable event' };
    return {
      deleteEventIds: [restorable.id],
      createEvents: [
        /* ... */
      ]
    };
  }
};
```

This is the same **Enrich (bulk SELECT) → Transform (pure)** split as the
`import-lovac` pipeline. The enriched fields (`statusEvents` here) are transient
inputs to `decide` — they are never serialized into `plan.jsonl`, so the plan
output stays clean.

- **External API:** same rule. Batch endpoint → call it once in `query()`.
  Per-item only → still pre-fetch in `query()` with bounded concurrency (chunked
  `Promise.all`) and build a `Map` keyed by the lookup field.
- Make `decide` async only as a last resort — a per-item source with no batch
  path _and_ a set too large to pre-fetch. It costs you the purity, the
  N+1 guarantee, and the mock-free `plan` tests.

## Registering a repair

Add one line to [`index.ts`](index.ts):

```ts
import { myRepair } from './my-repair';

export const repairs: Record<string, Repair<any>> = {
  'my-repair': myRepair
};
```

Registration is deliberately manual — see
[Why manual registration?](#why-manual-registration).

## How `apply` stays safe

- **Atomic.** The whole plan runs inside one `startTransaction`; any error rolls
  everything back.
- **Chunked.** Updates, deletes and inserts are batched in groups of 1000 so a
  large plan doesn't blow up a single query.
- **Grouped updates.** Rows sharing the same `update` payload are updated
  together, so N housings with the same fix cost one `UPDATE` per chunk instead
  of N.
- **Reported counts are requested counts.** `eventsCreated` / `eventsDeleted`
  report what the plan asked for. Inserts use `ON CONFLICT … IGNORE`, so if an
  event id already exists the row is skipped without changing the count.

## Large repairs (bypassing count triggers)

`fast_housing` carries `FOR EACH ROW` triggers that recompute derived counts
whenever `status` or `occupancy` changes (`campaigns.return_count`, buildings'
rent/vacant counts); `housing_events` has one too. For a big repair — the
canonical one _is_ a status change — those per-row fires dominate the runtime.

Partition pruning is **not** the concern: PostgreSQL prunes the
`WHERE (geo_code, id) IN (…)` that `apply` emits down to just the departments
touched. The triggers are.

Set `bypassTriggers` to disable those triggers, apply the plan, recompute the
counts **once**, then re-enable them — **all inside the transaction** (reusing
`import-lovac`'s `housings-counts-maintenance`). It's opt-in because
`ALTER TABLE … DISABLE TRIGGER` takes ACCESS EXCLUSIVE on `fast_housing`
(concurrent writers block until the repair finishes) and it forces a full counts
recompute — worth it for tens of thousands of rows, wasteful for a few hundred.

Doing the disable **inside** the transaction is deliberate: it's what makes an
interrupt safe. Because `ALTER TABLE … DISABLE TRIGGER` is transactional, an
early exit — Ctrl-C, SIGTERM, SIGKILL, a crash, a dropped connection — rolls the
whole transaction back and the triggers are **never left disabled**. No signal
handler is involved (SIGKILL can't be caught anyway); the database guarantees
it. A committed-then-disabled approach would strand the triggers off on any of
those exits, silently breaking count maintenance for every later write.

**Resolution precedence** (highest wins):

1. CLI flag — `--bypass-triggers` / `--no-bypass-triggers`
2. `repair.bypassTriggers` — the author's declared default
3. `false` — flat default

The default is a **flat `false`, not row-count-based**: the cost tracks trigger
fires on the watched columns, not row count (a 50 000-row `subStatus`-only
repair fires none of them; a 2 000-row `occupancy` repair does), so a
`query().length` threshold would both over- and under-trigger. The repair author
knows the scale and which columns change, so they declare it; the operator can
override per run.

```ts
export const restoreStatus: Repair = {
  name: 'restore-status',
  bypassTriggers: true, // large, status-changing repair
  query: () =>
    housingRepository.find({
      filters: {
        /* ... */
      }
    }),
  decide: (housing) => ({ update: { status: HousingStatus.NEVER_CONTACTED } })
};
```

## Why manual registration?

Repairs are rare, deliberate, destructive operations. The registry in
`index.ts` is the audit surface (`repair list` reads it) and keeps the whole set
type-checked and greppable. Auto-discovery by globbing would trade that away for
convenience we don't need — adding a repair is not a hot path, and requiring an
explicit line is a feature, not a chore.
