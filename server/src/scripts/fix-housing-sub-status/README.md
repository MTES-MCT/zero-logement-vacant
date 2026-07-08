# fix-housing-sub-status

Repairs `fast_housing` rows whose `status` requires a `sub_status` (FIRST_CONTACT,
IN_PROGRESS, COMPLETED, BLOCKED) but have `sub_status IS NULL`.

Two phases. `generate` reads the DB and writes an inspectable plan; `apply` writes
the changes. The `*.jsonl` outputs are git-ignored — keep them as history.

## Decision rule (per housing)

1. **Still vacant (in `lovac-2026`)** → the housing reappears in the latest file, so
   any "exited" follow-up is contradicted. Reset to **NEVER_CONTACTED**, _unless_ the
   latest event is a valid **active** status (first-contact / in-progress / blocked),
   which is kept. This also rescues housings whose latest event was corrupted by the
   sub-status-nulling bug.
2. **Not in `lovac-2026`** → trust the latest `housing:status-updated` event:
   - valid `(status, sub_status)` → restore it;
   - unusable event (unknown status / missing-or-invalid sub-status) → `errors.jsonl`;
   - no event, already COMPLETED → COMPLETED + "Sortie de la vacance";
   - no event, other status → `review.jsonl` (product decision).

## 1. Stats (optional, run manually)

Run `stats.sql` against the target Postgres to size the problem.

## 2. Generate the plan

```bash
yarn workspace @zerologementvacant/server tsx \
  src/scripts/fix-housing-sub-status/index.ts generate
```

Produces three files, each carrying `data_file_years` for inspection:

- `plan.jsonl` — housings that **will be updated**, with `source`
  (`event` | `fallback-lovac` | `fallback-completed`).
- `errors.jsonl` — housings **left untouched**: the latest `housing:status-updated`
  event could not yield a valid `(status, sub_status)` (`missing-or-unknown-status`
  | `invalid-sub-status`).
- `review.jsonl` — housings **left untouched**: no event history and not in
  lovac-2026, with a non-COMPLETED status (`no-event-non-completed`). No basis to
  rewrite the status — hand these to the product team for a decision.

Inspect, e.g. with DuckDB:

```sql
SELECT source, count(*) FROM read_json_auto('plan.jsonl') GROUP BY source;
SELECT reason, count(*) FROM read_json_auto('errors.jsonl') GROUP BY reason;
SELECT count(*) FROM read_json_auto('review.jsonl');
-- lovac-2026 membership of event-sourced rows (drives the lovac-precedence decision):
SELECT source, list_contains(data_file_years, 'lovac-2026') AS in_lovac_2026, count(*)
FROM read_json_auto('plan.jsonl') GROUP BY 1, 2 ORDER BY 1, 2;
```

> **Note:** `target_status` may differ from `current_status` — a housing's `status`
> can be rewritten (reset to NEVER_CONTACTED, or restored from an event), not just
> its `sub_status` backfilled. Both columns are recorded in `plan.jsonl`; inspect
> them before applying.

## 3. Apply the plan

```bash
yarn workspace @zerologementvacant/server tsx \
  src/scripts/fix-housing-sub-status/index.ts apply
```

Reads `plan.jsonl`, groups by target `(status, sub_status)`, and updates in a single
transaction. No audit events are written.

> **Note:** `apply` overwrites rows from `plan.jsonl` without re-checking current DB
> state. Re-generate and apply promptly — do not apply a stale plan.
