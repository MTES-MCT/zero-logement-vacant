# fix-housing-sub-status

Repairs `fast_housing` rows whose `(status, sub_status)` is invalid, in any of three
ways (each row is tagged `selected_by`):

- `null-sub` — a status that requires a sub-status (FIRST_CONTACT, IN_PROGRESS,
  COMPLETED, BLOCKED) has `sub_status IS NULL`;
- `wrong-sub` — such a status carries a sub-status that isn't in its valid set;
- `forbidden-sub` — NEVER_CONTACTED / WAITING carries a sub-status (it must have none).

Two phases. `generate` reads the DB and writes an inspectable plan; `apply` writes
the changes. The `*.jsonl` outputs are git-ignored — keep them as history.

## Decision rule (per housing)

The current pair and the latest `housing:status-updated` event are first normalised
through the migration-073 legacy renames (status labels and sub-statuses — see
`legacy.ts`). Then, by **lovac-year cohort**:

1. **Still vacant** (in `lovac-2026`) → reset to **NEVER_CONTACTED**, unless the
   current pair or the latest event is a valid **active** status (first-contact /
   in-progress / blocked), which is kept.
2. **Exited** (was in some `lovac-*` file but not 2026) — mirrors the LOVAC import's
   existing-housing exit (`import-lovac/housings/housing-transform.ts`):
   - a usable event → **restore it** (the event is the source of truth, e.g. a manual
     `Suivi en cours / Intervention publique`);
   - else if occupancy = **VACANT** and it was in **lovac-2025** → the import should
     have exited it: occupancy → **"Pas d'information"**, status → **COMPLETED /
     "Sortie de la vacance"**, and write a `housing:status-updated` **and** a
     `housing:occupancy-updated` event (deterministic `uuidv5`, keyed on `lovac-2026`);
   - else (older exit, or no longer vacant) → **COMPLETED / "Sortie de la vacance"**,
     no event, no occupancy change.
3. **Never vacancy-tracked** (only `ff-*` / manual) →
   - the current pair is valid after renaming → keep it;
   - else a usable event → restore it;
   - else, recover from an otherwise-unusable event:
     - a sub-status-only event whose sub is valid for the current status → adopt it,
       keep the event (`event-sub-adopt`);
     - the event nulled a previously-valid sub-status → revert to its `next_old`
       sub-status and **delete** the bug event (`event-revert`);
   - else the event is still unusable → `errors.jsonl` (skip & log);
   - else (no event) → **NEVER_CONTACTED**.

The definition of "valid" comes from the app's own `getSubStatuses` — the selection
query is built from it, so it can't drift.

**Events are written by `apply` only for the lovac-exit rows** (`exit = true`): a
`housing:status-updated` + a `housing:occupancy-updated`, with deterministic `uuidv5`
ids (so re-runs don't duplicate). Every other case writes no event; `event-revert`
additionally deletes its bug event (`delete_event_id`). No other cohort is touched.

## 1. Stats (optional, run manually)

Run `stats.sql` against the target Postgres to size the problem.

## 2. Generate the plan

```bash
yarn workspace @zerologementvacant/server tsx \
  src/scripts/fix-housing-sub-status/index.ts generate
```

Produces two files, each carrying `cohort`, `current_sub_status`, `data_file_years`,
`latest_event` and `selected_by`:

- `plan.jsonl` — housings that **will be updated**, with `source` (`keep-active` |
  `lovac-reset` | `lovac-exit` | `completed-fallback` | `event-restore` |
  `legacy-rename` | `fallback-never-contacted` | `event-sub-adopt` | `event-revert`),
  plus `current_occupancy`, `target_occupancy`, `exit` and `delete_event_id`.
- `errors.jsonl` — housings **left untouched**: the latest event is unusable
  (`sub-status-nulled` | `unknown-status-label`), so there is no safe repair.

Inspect, e.g. with DuckDB:

```sql
SELECT cohort, source, count(*) FROM read_json_auto('plan.jsonl') GROUP BY 1, 2 ORDER BY 1, 2;
SELECT reason, count(*) FROM read_json_auto('errors.jsonl') GROUP BY reason;
```

> **Note:** `target_status` may differ from `current_status` — a housing's `status`
> can be rewritten (reset to NEVER_CONTACTED, or restored from an event), not just
> its `sub_status` backfilled. Both columns are recorded in `plan.jsonl`; inspect
> them before applying.

## 3. Apply the plan

Dry-run first (reads the plan + admin user, logs the counts, writes nothing):

```bash
yarn workspace @zerologementvacant/server tsx \
  src/scripts/fix-housing-sub-status/index.ts apply --dry-run
```

Then apply for real:

```bash
yarn workspace @zerologementvacant/server tsx \
  src/scripts/fix-housing-sub-status/index.ts apply
```

Reads `plan.jsonl` and, in a **single transaction** (each statement chunked at 1,000):
groups by target `(status, sub_status)` and `updateMany`; writes admin
`housing:status-updated` + `housing:occupancy-updated` events for the lovac-exit rows (`exit`); deletes the bug
events (`delete_event_id`). Atomic — any failure rolls the whole run back.

> **Run once.** Events get fresh UUIDs each run, so re-running duplicates them. A
> failed run rolls back cleanly and is safe to re-run; a successful run must not be
> repeated.
>
> **Don't apply a stale plan.** `apply` overwrites from `plan.jsonl` without
> re-checking the DB — re-`generate` immediately before applying, and run off-peak
> (it locks ~17k rows for the transaction's duration).

## 4. Verify (before / after)

Run `verify.sql` before and after `apply` and compare (coverage, status shift, event
count). The definitive coverage check is to re-run `generate` after `apply` — it
should report ~0 housings to repair.
