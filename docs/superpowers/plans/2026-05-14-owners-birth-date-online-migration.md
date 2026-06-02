# Owners `birth_date` Online Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `owners.birth_date` from `timestamptz` (with Paris-midnight values stored as UTC, e.g. `1943-07-23 22:00:00+00`) to `date` (e.g. `1943-07-24`) on a ~81M-row production table without long-duration `ACCESS EXCLUSIVE` locks.

**Architecture:** Add a new `birth_date_new date` column (catalog-only, instant), keep it in sync via a `BEFORE INSERT/UPDATE` trigger, backfill in small batches over hours, then atomically drop the old column and rename the new one in a sub-second transaction.

**Tech Stack:** PostgreSQL 14+, Knex migrations (TypeScript), `psql` for ops scripts, `node-postgres` (parser caveat — see Task 1).

---

## Critical Context (read first)

- **PK:** `owners.id uuid` (defaulted to `uuid_generate_v4()`).
- **Indexes referencing `birth_date`:** none (the two `owners_full_name_birth_date_*_idx` were dropped in `20240726130601-owners-drop-unique-indexes.ts`). Re-verify in Task 1.
- **node-postgres `date` parsing trap (from migration `092-owners-birth-date.ts`):** when a column is typed `date`, the pg driver returns `new Date(year, month, day)` interpreted in the **server's local TZ**. If the API server runs in UTC this is fine; if it runs in `Europe/Paris` (or anything ≠ UTC), reads will shift. Migration 092 picked `datetime` specifically to dodge this. Before swapping back to `date`, EITHER:
  - Confirm the API container's `TZ` is `UTC` (it usually is for Scalingo/Clever Cloud), AND/OR
  - Override the parser globally: `pg.types.setTypeParser(1082, (v) => v)` so `date` columns come back as ISO strings (`'1943-07-24'`).
- **No DELETE/INSERT.** All work is `UPDATE`/`ALTER`/`CREATE TRIGGER`.

---

## File Structure

- New: `server/src/scripts/owners-birth-date-migration/preflight.sql` — read-only sanity checks.
- New: `server/src/scripts/owners-birth-date-migration/01-add-column-and-trigger.sql` — adds column, function, trigger.
- New: `server/src/scripts/owners-birth-date-migration/02-backfill.sh` — batched backfill driver.
- New: `server/src/scripts/owners-birth-date-migration/03-verify.sql` — post-backfill verification queries.
- New: `server/src/scripts/owners-birth-date-migration/04-swap.sql` — atomic swap transaction.
- New: `server/src/scripts/owners-birth-date-migration/README.md` — runbook order + rollback.
- New: `server/src/infra/database/migrations/<timestamp>_owners-birth-date-back-to-date.ts` — Knex migration that reflects the final schema (run AFTER the data work; on prod, mark as already-applied in `knex_migrations`).

---

## Task 1: Pre-flight checks

**Files:**
- Create: `server/src/scripts/owners-birth-date-migration/preflight.sql`

- [ ] **Step 1: Write the preflight SQL**

```sql
-- preflight.sql — run with: psql "$DATABASE_URL" -f preflight.sql
\timing on

-- 1. Confirm current column type is timestamptz.
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'owners' AND column_name = 'birth_date';
-- Expect: data_type = 'timestamp with time zone', udt_name = 'timestamptz'

-- 2. Approximate row count (cheap; pg_class.reltuples).
SELECT reltuples::bigint AS approx_rows
FROM pg_class
WHERE relname = 'owners';
-- Expect: ~81e6

-- 3. Indexes touching birth_date (must be empty).
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'owners' AND indexdef ILIKE '%birth_date%';
-- Expect: 0 rows

-- 4. Foreign keys touching birth_date (must be empty).
SELECT tc.constraint_name, tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
WHERE tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'PRIMARY KEY')
  AND kcu.column_name = 'birth_date';
-- Expect: 0 rows

-- 5. Views/materialized views referencing birth_date.
SELECT schemaname, viewname FROM pg_views WHERE definition ILIKE '%birth_date%';
SELECT schemaname, matviewname FROM pg_matviews WHERE definition ILIKE '%birth_date%';
-- Inspect any results manually.

-- 6. Sample known rows for post-swap verification (from the user's question).
SELECT idpersonne, birth_date,
       (birth_date AT TIME ZONE 'Europe/Paris')::date AS expected_after
FROM owners
WHERE idpersonne IN ('01MB2223','01MB2225','01MB2226','01MB2227','01MB222B')
ORDER BY idpersonne;
-- Save the `expected_after` column to compare in Task 5.

-- 7. NULL counts (used in Task 5 invariant).
SELECT
  count(*) FILTER (WHERE birth_date IS NULL)     AS null_birth_date,
  count(*) FILTER (WHERE birth_date IS NOT NULL) AS not_null_birth_date,
  count(*)                                       AS total
FROM owners;
```

- [ ] **Step 2: Run preflight against production (read-only, safe)**

```bash
psql "$PROD_DATABASE_URL" -f server/src/scripts/owners-birth-date-migration/preflight.sql > preflight.out
```

Expected: column type `timestamptz`, zero indexes/FKs on `birth_date`, ~81M rows. Save `preflight.out` for the runbook record.

- [ ] **Step 3: Decide node-postgres date-parser strategy**

Confirm one of:
- API container `TZ=UTC` (check Scalingo/Clever env), OR
- Add `pg.types.setTypeParser(1082, (v) => v)` to `server/src/infra/database/index.ts` (or wherever `pg`/`knex` is initialised).

If neither holds, **abort** — Task 6 will silently shift dates on read after the swap.

- [ ] **Step 4: Commit preflight**

```bash
git add server/src/scripts/owners-birth-date-migration/preflight.sql
git commit -m "chore(server): add owners.birth_date migration preflight script"
```

---

## Task 2: Add the new column

**Files:**
- Create: `server/src/scripts/owners-birth-date-migration/01-add-column-and-trigger.sql` (column part only in this task; trigger added in Task 3)

- [ ] **Step 1: Write the ADD COLUMN statement**

```sql
-- 01-add-column-and-trigger.sql (part 1: column)
ALTER TABLE owners ADD COLUMN birth_date_new date;
```

PG ≥ 11 makes this a catalog-only operation: instant, no rewrite, brief `ACCESS EXCLUSIVE`.

- [ ] **Step 2: Apply on production**

```bash
psql "$PROD_DATABASE_URL" -c "ALTER TABLE owners ADD COLUMN birth_date_new date;"
```

Expected: returns `ALTER TABLE` in well under 1 second.

- [ ] **Step 3: Verify column exists and is empty**

```bash
psql "$PROD_DATABASE_URL" -c "SELECT count(*) FROM owners WHERE birth_date_new IS NOT NULL;"
```

Expected: `0`.

---

## Task 3: Add sync trigger

**Files:**
- Modify: `server/src/scripts/owners-birth-date-migration/01-add-column-and-trigger.sql` (append trigger)

- [ ] **Step 1: Write the trigger function and trigger**

Append to `01-add-column-and-trigger.sql`:

```sql
-- 01-add-column-and-trigger.sql (part 2: trigger)
CREATE OR REPLACE FUNCTION sync_owners_birth_date_new() RETURNS trigger AS $$
BEGIN
  NEW.birth_date_new := (NEW.birth_date AT TIME ZONE 'Europe/Paris')::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_owners_birth_date_new
  BEFORE INSERT OR UPDATE OF birth_date ON owners
  FOR EACH ROW EXECUTE FUNCTION sync_owners_birth_date_new();
```

`NULL AT TIME ZONE 'Europe/Paris'` returns `NULL`, so `NULL` birth_dates stay `NULL` in the new column.

- [ ] **Step 2: Apply trigger to production**

```bash
psql "$PROD_DATABASE_URL" -f server/src/scripts/owners-birth-date-migration/01-add-column-and-trigger.sql
```

Expected: `CREATE FUNCTION`, `CREATE TRIGGER`. Sub-second.

- [ ] **Step 3: Smoke-test the trigger in a rolled-back transaction**

```sql
BEGIN;
  -- Pick one row to mutate
  UPDATE owners
  SET birth_date = birth_date  -- no-op write
  WHERE idpersonne = '01MB2223';

  SELECT idpersonne, birth_date, birth_date_new
  FROM owners WHERE idpersonne = '01MB2223';
  -- Expect birth_date_new = '1943-07-24'
ROLLBACK;
```

- [ ] **Step 4: Commit script**

```bash
git add server/src/scripts/owners-birth-date-migration/01-add-column-and-trigger.sql
git commit -m "chore(server): add owners.birth_date_new sync trigger"
```

---

## Task 4: Backfill in batches

**Files:**
- Create: `server/src/scripts/owners-birth-date-migration/02-backfill.sh`

- [ ] **Step 1: Create a partial index to make the IS NULL scan cheap**

```bash
psql "$PROD_DATABASE_URL" <<'SQL'
CREATE INDEX CONCURRENTLY IF NOT EXISTS owners_birth_date_new_pending_idx
  ON owners (id)
  WHERE birth_date_new IS NULL AND birth_date IS NOT NULL;
SQL
```

`CONCURRENTLY` avoids blocking writes. The index drains to empty as the backfill progresses; drop it in Task 6.

- [ ] **Step 2: Write the batch script**

```bash
#!/usr/bin/env bash
# 02-backfill.sh — backfill owners.birth_date_new in batches.
# Usage: DATABASE_URL=... BATCH_SIZE=50000 SLEEP=0.2 ./02-backfill.sh
set -euo pipefail

: "${DATABASE_URL:?must be set}"
BATCH_SIZE="${BATCH_SIZE:-50000}"
SLEEP="${SLEEP:-0.2}"

while :; do
  updated=$(psql "$DATABASE_URL" -At -c "
    WITH batch AS (
      SELECT id FROM owners
      WHERE birth_date_new IS NULL AND birth_date IS NOT NULL
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE owners o
    SET birth_date_new = (o.birth_date AT TIME ZONE 'Europe/Paris')::date
    FROM batch b
    WHERE o.id = b.id
    RETURNING 1;
  " | wc -l | tr -d ' ')

  printf '%s  updated=%s\n' "$(date -Iseconds)" "$updated"
  if [[ "$updated" -eq 0 ]]; then
    echo "Backfill complete."
    break
  fi
  sleep "$SLEEP"
done
```

`FOR UPDATE SKIP LOCKED` lets the trigger-driven writes from app traffic run in parallel without deadlocks.

- [ ] **Step 3: Make executable and dry-run on staging**

```bash
chmod +x server/src/scripts/owners-birth-date-migration/02-backfill.sh
DATABASE_URL="$STAGING_DATABASE_URL" BATCH_SIZE=10000 \
  server/src/scripts/owners-birth-date-migration/02-backfill.sh | tee backfill-staging.log
```

Expected: progresses to `Backfill complete.` Confirm timings to size the prod run (~81M / 50k ≈ 1620 batches; budget the wall-clock).

- [ ] **Step 4: Run on production (in `tmux`/`screen`)**

```bash
tmux new -s birth-date-backfill
DATABASE_URL="$PROD_DATABASE_URL" BATCH_SIZE=50000 SLEEP=0.2 \
  server/src/scripts/owners-birth-date-migration/02-backfill.sh \
  | tee backfill-prod.log
# Detach with Ctrl-B D; reattach with: tmux attach -t birth-date-backfill
```

Monitor in another shell:

```bash
psql "$PROD_DATABASE_URL" -c "
SELECT count(*) FILTER (WHERE birth_date_new IS NULL AND birth_date IS NOT NULL) AS pending,
       count(*) FILTER (WHERE birth_date_new IS NOT NULL) AS done
FROM owners;"
```

- [ ] **Step 5: Commit script**

```bash
git add server/src/scripts/owners-birth-date-migration/02-backfill.sh
git commit -m "chore(server): add owners.birth_date_new backfill script"
```

---

## Task 5: Verify backfill

**Files:**
- Create: `server/src/scripts/owners-birth-date-migration/03-verify.sql`

- [ ] **Step 1: Write verification queries**

```sql
-- 03-verify.sql

-- A. NULL invariant: birth_date NULL ⇔ birth_date_new NULL.
SELECT count(*) AS mismatched_nulls
FROM owners
WHERE (birth_date IS NULL) <> (birth_date_new IS NULL);
-- Expect: 0

-- B. No pending rows.
SELECT count(*) AS pending
FROM owners
WHERE birth_date IS NOT NULL AND birth_date_new IS NULL;
-- Expect: 0

-- C. Spot check the same rows captured in preflight Step 6.
SELECT idpersonne, birth_date, birth_date_new
FROM owners
WHERE idpersonne IN ('01MB2223','01MB2225','01MB2226','01MB2227','01MB222B')
ORDER BY idpersonne;
-- Compare birth_date_new column-for-column with preflight `expected_after`.

-- D. Sanity: every birth_date_new equals the on-the-fly conversion.
SELECT count(*) AS conversion_drift
FROM owners
WHERE birth_date IS NOT NULL
  AND birth_date_new IS DISTINCT FROM (birth_date AT TIME ZONE 'Europe/Paris')::date;
-- Expect: 0
```

- [ ] **Step 2: Run on production**

```bash
psql "$PROD_DATABASE_URL" -f server/src/scripts/owners-birth-date-migration/03-verify.sql
```

Expected: A=0, B=0, C matches preflight, D=0. **If any check fails, do not proceed to Task 6.** Re-run the backfill (idempotent — it only touches NULL rows).

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/owners-birth-date-migration/03-verify.sql
git commit -m "chore(server): add owners.birth_date_new verification queries"
```

---

## Task 6: Atomic swap

**Files:**
- Create: `server/src/scripts/owners-birth-date-migration/04-swap.sql`

- [ ] **Step 1: Write the swap transaction**

```sql
-- 04-swap.sql — single short transaction. ACCESS EXCLUSIVE for ~ms.
BEGIN;

-- Tear down the trigger first so we don't double-write during the swap.
DROP TRIGGER IF EXISTS trg_sync_owners_birth_date_new ON owners;
DROP FUNCTION IF EXISTS sync_owners_birth_date_new();

-- Drop the partial backfill helper (now empty).
DROP INDEX IF EXISTS owners_birth_date_new_pending_idx;

-- Atomic column swap.
ALTER TABLE owners DROP COLUMN birth_date;
ALTER TABLE owners RENAME COLUMN birth_date_new TO birth_date;

COMMIT;
```

All four `ALTER`s are catalog-only on PG ≥ 11; the transaction should commit in milliseconds.

- [ ] **Step 2: Run on production during a low-traffic window**

```bash
psql "$PROD_DATABASE_URL" -f server/src/scripts/owners-birth-date-migration/04-swap.sql
```

- [ ] **Step 3: Verify final state**

```bash
psql "$PROD_DATABASE_URL" -c "
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='owners' AND column_name='birth_date';"
# Expect: data_type = 'date'

psql "$PROD_DATABASE_URL" -c "
SELECT idpersonne, birth_date FROM owners
WHERE idpersonne IN ('01MB2223','01MB2225','01MB2226','01MB2227','01MB222B')
ORDER BY idpersonne;"
# Expect: birth_date = 1943-07-24, 1974-11-11, 1944-01-10, 1963-07-21, 1971-09-28
```

- [ ] **Step 4: Commit**

```bash
git add server/src/scripts/owners-birth-date-migration/04-swap.sql
git commit -m "chore(server): add owners.birth_date column swap script"
```

---

## Task 7: Knex migration to record schema state

The data work above is operational and bypasses Knex. We still need a Knex migration so fresh environments (dev, staging, CI) end up at the same schema, and so `knex_migrations` reflects the live shape on prod.

**Files:**
- Create: `server/src/infra/database/migrations/<UTC-timestamp>_owners-birth-date-to-date.ts`

- [ ] **Step 1: Generate the migration file**

```bash
yarn workspace @zerologementvacant/server knex migrate:make owners-birth-date-to-date -x ts
```

- [ ] **Step 2: Write up/down**

```ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE owners
      ALTER COLUMN birth_date TYPE date
      USING (birth_date AT TIME ZONE 'Europe/Paris')::date;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE owners
      ALTER COLUMN birth_date TYPE timestamptz
      USING (birth_date::timestamp AT TIME ZONE 'Europe/Paris');
  `);
}
```

For dev/staging this runs the in-place ALTER (cheap on small data). On production the column is **already** `date`, so we mark this migration as applied without running it (Step 4).

- [ ] **Step 3: Run on staging to validate**

```bash
yarn workspace @zerologementvacant/server migrate
```

Expected: migration runs cleanly; column is `date`; verification queries (Task 5) still pass.

- [ ] **Step 4: Mark as applied on production (do NOT run it)**

```bash
psql "$PROD_DATABASE_URL" -c "
INSERT INTO knex_migrations (name, batch, migration_time)
SELECT '<filename>.ts',
       coalesce(max(batch), 0) + 1,
       now()
FROM knex_migrations;"
```

Replace `<filename>.ts` with the exact name produced in Step 1. Verify with `SELECT name FROM knex_migrations ORDER BY id DESC LIMIT 5;`.

- [ ] **Step 5: Commit migration**

```bash
git add server/src/infra/database/migrations/*owners-birth-date-to-date.ts
git commit -m "feat(server): change owners.birth_date type from timestamptz to date"
```

---

## Task 8: Runbook

**Files:**
- Create: `server/src/scripts/owners-birth-date-migration/README.md`

- [ ] **Step 1: Write the runbook**

```markdown
# owners.birth_date timestamptz → date

Why: 45M rows imported via DuckDB landed as Paris-midnight timestamps stored
as UTC (e.g. `1943-07-23 22:00:00+00`). We want a real `date` column.

Order:
1. `preflight.sql`            — read-only checks; record output.
2. Confirm `pg.types.setTypeParser(1082, …)` or `TZ=UTC` on the API.
3. `01-add-column-and-trigger.sql`  — ADD COLUMN + trigger (instant).
4. `CREATE INDEX CONCURRENTLY` (see 02-backfill.sh comment).
5. `02-backfill.sh`           — run in tmux; ~hours.
6. `03-verify.sql`            — must all pass.
7. `04-swap.sql`              — atomic, sub-second lock.
8. Knex migration marker insert (see plan Task 7 Step 4).

Rollback per stage:
- After step 3: `DROP TRIGGER trg_sync_owners_birth_date_new ON owners;
                 DROP FUNCTION sync_owners_birth_date_new();
                 ALTER TABLE owners DROP COLUMN birth_date_new;`
- After step 5 but before step 7: same as above (extra column is harmless).
- After step 7: irreversible without the timestamptz source. Only `down()`
  in the Knex migration approximates a revert (loses the time component).
```

- [ ] **Step 2: Commit**

```bash
git add server/src/scripts/owners-birth-date-migration/README.md
git commit -m "docs(server): runbook for owners.birth_date online migration"
```

---

## Self-review notes

- Spec coverage: every step from the option-C sketch (add column → trigger → batched backfill → verify → atomic swap) has an explicit task; preflight + node-pg parser caveat + Knex marker insert are added because they are real footguns on this codebase.
- Placeholders: none. Filenames, SQL, and shell are concrete; the only `<placeholder>` is the Knex-generated timestamp filename, which is unavoidable until Task 7 Step 1 runs.
- Type/name consistency: `birth_date_new`, `sync_owners_birth_date_new`, `trg_sync_owners_birth_date_new`, and `owners_birth_date_new_pending_idx` are used identically across Tasks 2–6.
