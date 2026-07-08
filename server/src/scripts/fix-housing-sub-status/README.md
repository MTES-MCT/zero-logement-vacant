# fix-housing-sub-status

Repairs `fast_housing` rows whose `status` requires a `sub_status` (FIRST_CONTACT,
IN_PROGRESS, COMPLETED, BLOCKED) but have `sub_status IS NULL`.

Two phases. `generate` reads the DB and writes an inspectable plan; `apply` writes
the changes. `plan.jsonl` / `errors.jsonl` are git-ignored — keep them as history.

## 1. Stats (optional, run manually)

Run `stats.sql` against the target Postgres to size the problem.

## 2. Generate the plan

```bash
yarn workspace @zerologementvacant/server tsx \
  src/scripts/fix-housing-sub-status/index.ts generate
```

Produces:

- `plan.jsonl` — housings that will be updated, with `source`
  (`event` | `fallback-lovac` | `fallback-completed`).
- `errors.jsonl` — housings to review (latest event could not yield a valid state);
  **left untouched**.

Inspect, e.g. with DuckDB:

```sql
SELECT source, count(*) FROM read_json_auto('plan.jsonl') GROUP BY source;
SELECT reason, count(*) FROM read_json_auto('errors.jsonl') GROUP BY reason;
```

## 3. Apply the plan

```bash
yarn workspace @zerologementvacant/server tsx \
  src/scripts/fix-housing-sub-status/index.ts apply
```

Reads `plan.jsonl`, groups by target `(status, sub_status)`, and updates in a single
transaction. No audit events are written.
