# Import LOVAC — Observability, Idempotency & Launcher

**Date:** 2026-04-14  
**Scope:** Five improvements to the LOVAC import pipeline: better reporting, deterministic IDs for re-runability, a Clever Cloud task launcher, pre/post DB snapshot stats, and a Notion export Skill.

---

## 1. Reporter improvements

### Short term

**`LoggerReporter` changes:**
- Add `created` and `updated` counters alongside the existing `passed`/`skipped`/`failed`.
- The load sink (`createOwnerLoadSink`) increments these via callbacks passed at construction time — the reporter itself stays a pure counter with no I/O knowledge.
- `failed(data, error)` logs the row's `idpersonne` (already available via `data`) so failures are traceable.
- `report()` emits a single structured JSON log line: `{ created, updated, skipped, failed, durationMs }`.

**`createOwnerLoadSink` changes:**
- Receives the reporter and calls `reporter.created(n)` / `reporter.updated(n)` at each flush.
- Logs `Inserting N owners...` / `Upserting N owners...` remain at DEBUG.

### Medium term

After the pipeline `finally` block runs `reporter.report()`, the command writes the same summary JSON to disk:

| `--from` value | Output location |
|---|---|
| `file` | `./import-lovac-<year>-owners.report.json` (working directory) |
| `s3` | S3 key: `<input-key>.report.json` (same bucket, alongside input file) |

The write happens in the command's `finally` block. If the write fails, it logs a warning but does not throw — the import result is not affected.

---

## 2. UUID v5 for deterministic IDs

### Motivation

Events are append-only. If the import is re-run (crash recovery, retry), `uuidv4()` generates new random IDs → duplicate events. UUID v5 makes IDs deterministic from input data, so `ON CONFLICT DO NOTHING` becomes safe on re-run.

### CLI change

A `--year <lovac-year>` option is added to **all** subcommands (`owners`, `housings`, `housing-owners`, `buildings`, `history`). It is **required** — the CLI exits with an error if omitted. Example value: `lovac-2026`.

The year string flows: CLI option → `ExecOptions.year` → processor/transform.

### Namespace constant

```typescript
// server/src/scripts/import-lovac/infra/constants.ts
import { v5 as uuidv5 } from 'uuid';
export const LOVAC_NAMESPACE = uuidv5.DNS; // or a project-specific UUID
```

A single file, imported wherever deterministic IDs are needed. No magic strings scattered across processors.

### Key composition

| Entity | UUID v5 key | Rationale |
|---|---|---|
| Owner (create path) | `v5(idpersonne, NAMESPACE)` | `idpersonne` is globally unique across all time — no year needed |
| `housing:occupancy-updated` event | `v5(housingId + ':housing:occupancy-updated:' + year, NAMESPACE)` | At most one such event per housing per LOVAC year |
| `housing:status-updated` event | `v5(housingId + ':housing:status-updated:' + year, NAMESPACE)` | At most one such event per housing per LOVAC year |

All other `uuidv4()` usages (housing creates, building creates) are replaced with `v5` using the same pattern — natural key + year where applicable.

### Re-run safety

With deterministic IDs, all inserts use `ON CONFLICT (id) DO NOTHING`. A re-run with the same `--year` and same input file produces identical IDs and is a no-op on already-inserted rows.

---

## 3. Clever Cloud task launcher

### Infrastructure

A **dedicated Clever Cloud task application** (Node.js type), created manually once in the Clever Cloud console. It has its own set of environment variables independent of the server app:
- `DATABASE_URL` — points to production/staging DB
- S3 credentials (`S3_*`)
- Any import-specific variables

The app ID is stored as `ZLV_IMPORT_APP_ID` in the operator's local shell profile or `.env.local` — never committed.

### Entrypoint

`clevercloud/import-lovac-entrypoint.sh` — the task app's start script. Reads env vars set by the trigger script:

```bash
#!/bin/bash
set -euo pipefail
yarn workspace @zerologementvacant/server tsx \
  src/scripts/import-lovac/cli.ts "$IMPORT_SUBCOMMAND" \
  --from s3 \
  --year "$IMPORT_YEAR" \
  "$IMPORT_FILE"
```

Optional flags (`--dry-run`, `--abort-early`, `--departments`) are appended when their env vars are set.

### Trigger script

`server/src/scripts/import-lovac/run-on-clevercloud.sh`:

```
Usage: ./run-on-clevercloud.sh <subcommand> --year <year> --file <s3-key> [--dry-run] [--abort-early]
```

Steps:
1. Parse arguments
2. `clever env set --app "$ZLV_IMPORT_APP_ID" IMPORT_SUBCOMMAND=<cmd> IMPORT_YEAR=<year> IMPORT_FILE=<file> [IMPORT_DRY_RUN=1]`
3. `clever restart --app "$ZLV_IMPORT_APP_ID" --wait`
4. `clever logs --app "$ZLV_IMPORT_APP_ID" --follow`

The operator runs each subcommand sequentially:
```bash
./run-on-clevercloud.sh owners        --year lovac-2026 --file owners.jsonl
./run-on-clevercloud.sh housings      --year lovac-2026 --file housings.jsonl
./run-on-clevercloud.sh housing-owners --year lovac-2026 --file housing-owners.jsonl
```

### Failure handling

- `set -euo pipefail` in the entrypoint — any CLI error exits with non-zero code.
- Clever Cloud surfaces the exit code in logs; the operator sees it in the terminal via `clever logs`.
- No automatic retry — the operator decides whether to re-run (safe because of idempotent IDs).

---

---

## 4. Pre/post DB snapshot stats

### Tool stack

- **DuckDB** — connects to PostgreSQL via the `postgres` extension, runs analytical queries locally
- **Youplot** — renders bar charts in the terminal from DuckDB CSV output

### Script

`server/src/scripts/import-lovac/stats/snapshot.sh <entity> <label> <DATABASE_URL>`:

1. Runs the SQL file for `<entity>` via DuckDB against the live DB
2. Saves result as `snapshot-<entity>-<label>.json` (e.g. `snapshot-owners-pre.json`)
3. Pipes distributions to `uplot bar` for immediate terminal visualization

Called by `run-on-clevercloud.sh` automatically before and after each subcommand. Can also be run standalone.

### Queries per entity

**Owners** (`stats/queries/owners.sql`):
- Total count
- Count with `idpersonne` vs `NULL`
- Count with `dgfip_address` vs `NULL`
- Breakdown by `kind_class`
- Breakdown by `data_source`

**Housings** (`stats/queries/housings.sql`):
- Total count
- Breakdown by `occupancy`
- Breakdown by `status`
- Count tagged with current LOVAC year vs previous years
- Count with `NULL` `rooms_count` or `living_area`

**Housing-owners** (`stats/queries/housing-owners.sql`):
- Total count
- Breakdown by `rank`
- Count with `idprocpte` vs `NULL`

**Events** (`stats/queries/events.sql`):
- Count by `type` (occupancy-updated, status-updated) for current LOVAC year

**Validation failures** — sourced from the reporter JSON written to S3/disk, not from the DB.

### Diff

`stats/diff.sh <pre.json> <post.json>` — prints a delta table to stdout:
```
Propriétaires        Avant       Après       Δ
Total                35 357 799  36 041 936  +684 137 (+1.9%)
Avec idpersonne      18 000 000  18 684 000  +684 000
Sans idpersonne       4 470 156   4 470 157       +1
```

---

## 5. Notion export Skill

### Scope

Invoked by the operator **after all subcommands and snapshots are complete**. The import itself runs headlessly via shell scripts; the Skill is a post-process reporting step.

### Invocation

```
/publish-lovac-report lovac-2026
```

### Skill location

`.claude/skills/publish-lovac-report/SKILL.md` — project-local skill, version-controlled in the repo.

### Steps the Skill performs

1. Finds all `snapshot-*-pre.json` and `snapshot-*-post.json` files for the given year
2. Reads reporter JSON files (owner/housing/housing-owner import summaries)
3. Computes deltas for each entity
4. Authenticates with Notion MCP
5. Creates a new Notion sub-page under `NOTION_LOVAC_PARENT_PAGE_ID` (env var)
6. Publishes **in French** with native Notion blocks:
   - **Callout blocks** for key totals (e.g. _"36 041 936 propriétaires après import, +684 137 (+1,9 %)"_)
   - **Table blocks** for each distribution (propriétaires par type, logements par occupation, etc.)
   - **Section headings** per entity (Propriétaires, Logements, Droits de propriété)
   - **Callout block** for validation failures (errors per field)

### What is NOT generated

- No ASCII charts (terminal-only, lost in Notion)
- No Markdown file — Notion is the single output
- Youplot charts remain a terminal-only tool during the import session

### Configuration

| Env var | Description |
|---|---|
| `NOTION_TOKEN` | Notion integration token |
| `NOTION_LOVAC_PARENT_PAGE_ID` | ID of the parent Notion page where yearly reports are created |

Stored in operator's local shell profile — never committed.

---

## Files changed

| File | Action |
|---|---|
| `server/src/scripts/import-lovac/infra/constants.ts` | **Create** — `LOVAC_NAMESPACE` |
| `server/src/scripts/import-lovac/infra/reporters/logger-reporter.ts` | **Modify** — add create/updated counters, log idpersonne on failure, structured report |
| `server/src/scripts/import-lovac/infra/reporters/reporter.ts` | **Modify** — add `created(n: number)` and `updated(n: number)` methods to `Reporter<T>` interface |
| `server/src/scripts/import-lovac/source-owners/source-owner-transform.ts` | **Modify** — `v5(idpersonne)` for creates, accept `year` in options |
| `server/src/scripts/import-lovac/source-owners/source-owner-command.ts` | **Modify** — add `year` to `ExecOptions`, wire reporter callbacks to sink, write report file |
| `server/src/scripts/import-lovac/source-housings/source-housing-processor.ts` | **Modify** — `v5` for housing creates + event IDs, accept `year` |
| `server/src/scripts/import-lovac/source-housings/source-housing-command.ts` | **Modify** — add `year` to options |
| `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-processor.ts` | **Modify** — `v5` for entity creates, accept `year` |
| `server/src/scripts/import-lovac/source-housing-owners/source-housing-owner-command.ts` | **Modify** — add `year` to options |
| `server/src/scripts/import-lovac/cli.ts` | **Modify** — add `--year` required option to all subcommands |
| `clevercloud/import-lovac-entrypoint.sh` | **Create** — task app start script |
| `server/src/scripts/import-lovac/run-on-clevercloud.sh` | **Create** — trigger script |
| `server/src/scripts/import-lovac/stats/snapshot.sh` | **Create** — pre/post DB snapshot script |
| `server/src/scripts/import-lovac/stats/diff.sh` | **Create** — delta comparison script |
| `server/src/scripts/import-lovac/stats/queries/owners.sql` | **Create** — owner stats queries |
| `server/src/scripts/import-lovac/stats/queries/housings.sql` | **Create** — housing stats queries |
| `server/src/scripts/import-lovac/stats/queries/housing-owners.sql` | **Create** — housing-owner stats queries |
| `server/src/scripts/import-lovac/stats/queries/events.sql` | **Create** — event stats queries |
| `.claude/skills/publish-lovac-report/SKILL.md` | **Create** — Notion export skill (publishes in French) |
| `server/src/scripts/import-lovac/README.md` | **Update** — operational runbook |
