# Exploration: LOVAC Import — Python Migration Deep Dive

**Date:** 2026-04-24
**Status:** Exploration
**Follows:** [2026-04-14-import-lovac-eetl.md](2026-04-14-import-lovac-eetl.md) (section "Python / Polars / Dagster evaluation")

---

## Context

The previous exploration identified a long-term migration to Python + Polars + Dagster
for the LOVAC import pipeline. This document dives into the technical details: tool
selection, PostgreSQL write strategies, integration with the existing `analytics/dagster/`
setup, testing, and reporting.

---

## Tool Selection

### Selected Stack

| Tool | Role |
|------|------|
| **Polars** | Extract (parquet/jsonl via `scan_parquet`, `read_ndjson`) + Transform (joins, computed fields) |
| **Pydantic** | Input validation with typed error messages |
| **psycopg** (v3) | Load to PostgreSQL via COPY protocol + SQL |
| **Dagster** | Orchestration (DAG, retries, lineage, UI, metadata) |

### Evaluated and Rejected

**DuckDB** — Strong analytical engine, but not an ETL framework. Cannot do upserts,
transactional multi-table writes, or orchestration. At our data scale (<10 GB),
performance is identical to Polars (both are an order of magnitude faster than
Spark/Dask/Pandas). Remains in use as the warehouse storage layer — no change there.

**dlt (data load tool)** — Automates staging tables + merge, but:
- Pollutes the production database with metadata tables (`_dlt_version`, `_dlt_loads`,
  `_dlt_pipeline_state`) and adds columns to every data table (`_dlt_id`, `_dlt_load_id`).
- Cannot do update-only writes. The `merge` disposition always inserts unmatched rows.
- Merge strategy is delete+insert, not UPDATE (more WAL, more dead tuples).
- Schema management conflicts with existing Knex migrations.
- Already defined in `analytics/dagster/src/assets/production_dlt.py` but not wired
  into the main pipeline. Appropriate for multi-source warehouse loading, not for
  controlled writes to a production app database.

**dbt** — Already in use for DuckDB warehouse transforms (`analytics/dbt/`). Reads from
PostgreSQL (via DuckDB POSTGRES attach), does not write to it. No role in the import
pipeline. Unchanged by this migration.

**Sling** — Data replication tool. We are transforming and upserting, not replicating.
Dependency present in `pyproject.toml` but unused (no sling config found). Not needed.

**Evidently AI** — ML drift detection library (Apache 2.0, free). Overkill for ETL
stats — provides p-values for distribution shifts when we need simple before/after counts.
A Polars `GROUP BY` one-liner is simpler and sufficient.

### Performance: DuckDB vs Polars

From PDS-H benchmarks (May 2025, pola.rs/posts/benchmarks):

| Scale | Polars streaming | DuckDB |
|-------|-----------------|--------|
| ~10 GB (SF-10) | 3.89s | 5.87s (1.5x slower) |
| ~100 GB (SF-100) | 23.94s (1.2x slower) | 19.65s |

At our scale (<10 GB), effectively identical. The bottleneck is PostgreSQL writes, not
the transform layer. Polars chosen for its typed DataFrame API and native Python
integration.

**Memory:** DuckDB has a full buffer manager with disk spilling (out-of-core) since
v0.9.0. Polars streaming reduces peak memory via its streaming engine but has no disk
spilling. At our data volume this is irrelevant — both fit comfortably in RAM.

---

## PostgreSQL Write Strategies

### Per-Entity Write Patterns

| Entity | SQL Pattern | Rationale |
|--------|-------------|-----------|
| **Owners** | `UPDATE ... FROM staging` | Update-only — never insert owners from LOVAC |
| **Housings** | `INSERT ... ON CONFLICT DO UPDATE` or `MERGE` (PG15+) | True upsert — new housings expected |
| **Housing-Owners** | `INSERT ... ON CONFLICT DO UPDATE` or `MERGE` | True upsert |
| **Events** | `INSERT ... ON CONFLICT DO NOTHING` | Append-only, idempotent via UUIDv5 |

### Bulk Load: COPY Protocol via ADBC

Polars `write_database(engine="adbc")` uses PostgreSQL COPY — ~600x faster than
row-level INSERTs. Data is loaded into a staging table, then SQL handles the
merge/update:

```python
cur.execute("CREATE TEMP TABLE stg (LIKE target INCLUDING DEFAULTS) ON COMMIT DROP")
df.write_database("stg", conn_string, engine="adbc", if_table_exists="append")
# Then: UPDATE, MERGE, or INSERT ... ON CONFLICT depending on entity
```

**TEMP vs UNLOGGED staging tables:** TEMP tables are session-scoped, skip WAL, and
auto-drop — appropriate for our single-session ETL. UNLOGGED tables are 2-5x faster
for writes and persist across sessions, but are truncated on crash. Use TEMP unless
staging data needs to be shared across connections.

### PostgreSQL Tuning for Bulk Operations

During import runs, consider temporarily adjusting:
- `maintenance_work_mem` — higher values speed up index rebuilds and VACUUM.
- `max_wal_size` — increase to avoid excessive checkpoints during bulk writes.
- `checkpoint_completion_target = 0.9` — spread checkpoint I/O.
- `synchronous_commit = off` — reduces fsync overhead (acceptable for idempotent imports
  that can be safely re-run).

### Batched Updates

A single `UPDATE ... FROM` on millions of rows holds all row locks until COMMIT and
generates massive WAL (one dead tuple per updated row, 3-5x write amplification).

Solution: batch 10K-50K rows per transaction, commit between batches:

```python
for offset in range(0, len(ids), batch_size):
    cur.execute("""
        UPDATE owners SET full_name = s.full_name, raw_address = s.raw_address
        FROM stg s
        WHERE owners.id = s.id AND owners.id = ANY(%s)
    """, (ids[offset:offset+batch_size],))
    conn.commit()
```

### UPDATE ... FROM vs INSERT ... ON CONFLICT

When all rows exist in the target (owner updates), `UPDATE ... FROM` is 10-30% faster.
`INSERT ... ON CONFLICT` has overhead from speculative insertion (attempt insert, fail on
unique index, then update). Reserve `ON CONFLICT` for true upsert scenarios.

### MERGE (PostgreSQL 15+)

SQL-standard `MERGE` is syntactic convenience with explicit `WHEN MATCHED / WHEN NOT
MATCHED` clauses. ~30% faster than `INSERT ... ON CONFLICT` for upserts (avoids
speculative insertion). Same executor path and locking behavior as `UPDATE ... FROM`.
No `RETURNING` support as of PG17.

### Other Patterns Considered

| Pattern | When to use | Our case |
|---------|-------------|----------|
| **Table swap** (CREATE + RENAME) | Replacing >50% of rows | No — partial updates. Also: FKs reference tables by OID, not name — swap breaks them unless using pg_repack for catalog-level OID swapping |
| **Partition swapping** (DETACH/ATTACH) | Table already partitioned | No — not partitioned |
| **Drop indexes + rebuild** | Up to 14x faster bulk loads | Risky on live tables |
| **HOT updates** | Only non-indexed columns updated | Worth enabling (fillfactor=80) |
| **Disable triggers** | Audit triggers slow down bulk ops | Evaluate per table |

---

## Idempotency and Replayability

Dagster retries at **asset granularity** (`FROM_FAILURE`): completed assets are skipped,
failed assets re-run from scratch. No intra-asset checkpointing.

For events (append-only), idempotency relies on:

1. **Deterministic UUIDs:** `UUIDv5(namespace, run_id + entity_id)` — same input always
   produces the same event ID.
2. **`ON CONFLICT DO NOTHING`:** Re-inserting the same event is a no-op.
3. **Batched commits:** Partial failure is safe — already-inserted events are skipped on
   retry.

This matches the existing `UUIDv5` pattern in the TypeScript pipeline.

---

## Reporting and Stats

Dagster `MaterializeResult` metadata replaces `.report.json` files:

```python
return MaterializeResult(metadata={
    "dagster/row_count": total,
    "rows_created": MetadataValue.int(created),
    "rows_updated": MetadataValue.int(updated),
    "occupancy_changes": MetadataValue.md(comparison.to_pandas().to_markdown()),
})
```

- **Numeric values** are auto-plotted as time-series across runs in the Dagster UI.
- **Markdown** renders tables for before/after distribution breakdowns.
- Before/after snapshots are computed with Polars `GROUP BY` — no extra framework needed.

---

## Integration with Existing Analytics Setup

### Current State

```
server/src/scripts/import-lovac/     TypeScript    → PostgreSQL (prod)
                                                          ↓
analytics/dagster/src/assets/dwh/    DuckDB POSTGRES attach (read-only)
analytics/dbt/                       dbt transforms → marts → Metabase
```

### Target State

```
analytics/dagster/src/assets/
    ├── import_lovac/                NEW: Polars + psycopg → PostgreSQL (prod)
    └── dwh/                         UNCHANGED: DuckDB → dbt → marts

server/src/scripts/import-lovac/     DELETED after migration
```

Same Dagster instance, same UI. The daily warehouse sync automatically picks up changes
written to PostgreSQL by the import assets.

### Folder Structure

```
analytics/dagster/src/assets/import_lovac/
├── __init__.py
├── assets.py          # Dagster assets (thin orchestration glue)
├── schemas.py         # Pydantic validation models
├── transforms.py      # Polars transform functions (pure, no I/O)
└── writers.py         # psycopg COPY + SQL logic (pure functions taking connection + DataFrame)
```

### Asset DAG

The current TypeScript pipeline has 4 subcommands: `source-housings`,
`source-owners`, `source-housing-owners`, and `existing-housings` (a verification
pass that resets occupancy/status for housings missing from the current LOVAC year).

```
source_housings ──→ validated_housings ──→ transformed_housings ──→ import_housings
source_owners   ──→ validated_owners   ──→ transformed_owners   ──→ import_owners
                                                                        ↓
source_housing_owners ──→ ... ──→ import_housing_owners ──→ import_events
                                                                        ↓
                                                         verify_existing_housings
```

`verify_existing_housings` runs after all imports and resets housings no longer present
in LOVAC. Dagster infers dependencies from function signatures. No manual wiring.

### dagster-polars

The `dagster-polars` package exists and provides IO managers for Polars DataFrames, but
only supports Parquet, Delta Lake, BigQuery, S3, and GCS — **not PostgreSQL**. There is
an open feature request (dagster-io/dagster#32700). For our PostgreSQL writes, we handle
I/O manually inside asset functions, which gives full control over transactions and
upsert semantics.

### Reusing Existing Infrastructure

| What | Reuse | New |
|------|-------|-----|
| S3 access (Cellar) | `Config.CELLAR_*` credentials, `boto3` already in deps | — |
| PostgreSQL connection | `psycopg2_connection_resource` in `resources/` | Upgrade to psycopg v3 |
| LOVAC S3 paths | `cerema.py` already defines paths per year | Reference same config |
| Dagster instance | Same `definitions.py`, same UI | Add assets to `Definitions()` |
| dbt / DuckDB / Metabase | Untouched — daily sync picks up PG changes | — |

### New Dependencies (pyproject.toml)

- `polars`
- `psycopg[binary]` (v3)
- `adbc-driver-postgresql` (for COPY protocol from Polars)
- `pydantic` (already present)

### No Rule Duplication

The database schema (Knex migrations) is the shared contract between the TypeScript app
and the Python pipeline. When the migration is complete, the TypeScript import scripts
are deleted. No types to keep in sync — the PostgreSQL table definitions are the
interface.

---

## Testing Strategy

### Layer Separation

Business rules live in **pure functions** (`transforms.py`, `schemas.py`), testable
without Dagster, without Docker, without anything but `pytest`.

| Layer | What to test | How | Speed |
|-------|-------------|-----|-------|
| **Validation** (`schemas.py`) | Pydantic rejects bad input | `pytest.raises`, hypothesis | ms |
| **Transforms** (`transforms.py`) | Polars logic, correct output | Build DataFrame, assert result | ms |
| **Writers** (`writers.py`) | SQL: update-only / upsert / idempotent | Real PostgreSQL test DB | ~100ms |
| **Assets** (`assets.py`) | Not tested directly | Thin glue calling pure functions | — |

### Test Structure

```
analytics/dagster/tests/import_lovac/
├── test_schemas.py         # Unit: validation rules
├── test_transforms.py      # Unit: Polars transforms
└── test_writers.py         # Integration: PostgreSQL test DB
```

---

## Running the Pipeline

**UI:** `dagster dev` → http://localhost:3000 → select assets → "Materialize"

**CLI:** `dagster asset materialize --select group:lovac_import`

No job or schedule initially — manual execution during testing and validation.

---

## Open Questions

- [ ] PostgreSQL version in production — MERGE requires 15+
- [ ] S3 access from the Dagster host — same Cellar credentials as existing external
      source ingestion?
- [ ] Migration plan — run TypeScript and Python in parallel on staging before switching?
- [ ] Event schema — are all current event types covered by the UUIDv5 pattern?
- [ ] HOT updates — which owner/housing columns are indexed? (determines fillfactor
      optimization applicability)
- [ ] Yup → Pydantic type sync — automated codegen or manual rewrite?
