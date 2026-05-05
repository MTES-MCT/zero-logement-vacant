---
name: dagster-asset
description: >
  Use when adding or modifying a Dagster asset, job, schedule, or resource in
  `analytics/dagster/`. Enforces ZLV asset key conventions, the
  CustomizedDagsterDbtTranslator contract, retry/resource wiring, and a
  validate→materialize verification loop. Trigger phrases: "add a dagster
  asset", "new ingest pipeline", "schedule a refresh", "create a multi_asset".
---

# Skill: Add or modify a Dagster asset

> Read first: `analytics/dagster/QUICK_START.md`,
> `analytics/dagster/src/definitions.py`,
> `analytics/dagster/src/assets/production_dbt.py` (the dbt translator).

## Decide what you're building

| Need | Pattern |
|---|---|
| Pull a new external file (HTTP/S3/data.gouv.fr/INSEE) | Add a `SourceConfig` to `EXTERNAL_SOURCES` (see `external-source-onboarding` skill) |
| Pull a new PostgreSQL table | New `@asset` in `src/assets/dwh/ingest/ingest_postgres_asset.py` style |
| Run a dbt subset | dbt is already an asset graph via `dbt_production_assets` — wire selection via a job, not a new asset |
| Periodic recurring job | Add a `ScheduleDefinition` in `definitions.py` |
| Side effect (Clever restart, S3 upload) | Standalone `@asset` in `src/assets/<area>/` |

## Hard rules

1. **Asset keys are stable contracts.** dbt sources reference them as
   `raw_<source_name>`. The `CustomizedDagsterDbtTranslator` derives this in
   `src/assets/production_dbt.py` — don't bypass it.
2. **Group naming follows producer/layer.** External sources →
   `group_name=config["producer"].lower()`. dbt → `staging` / `intermediate` /
   `marts` / `common` / `seeds` (set by translator).
3. **`deps=["setup_duckdb"]`** for any asset that touches DuckDB. Add
   `"setup_external_schema"` for assets writing to the `external` schema.
4. **Use resources, never construct DuckDB connections inline.**
   `duckdb: DuckDBResource` is the canonical handle.
5. **Secrets via `Config`** (in `src/config.py`). Update `.env.example` if
   you add a new env var. Never hardcode tokens.
6. **Retries via `RetryPolicy`**:
   ```python
   from dagster import RetryPolicy
   RetryPolicy(max_retries=Config.DAGSTER_RETRY_MAX_ATTEMPS,
               delay=Config.DAGSTER_RETRY_DELAY)
   ```
7. **Wire to a job/schedule.** A new asset that's not in any selection is
   invisible to ops — explicitly add it to `daily_update_dwh_job`,
   `yearly_update_all_external_sources_job`, or a new job, OR document why
   it's manual-only.

## Asset template

```python
from dagster import asset, AssetExecutionContext, MaterializeResult, RetryPolicy
from dagster_duckdb import DuckDBResource
from ....config import Config


@asset(
    name="my_new_asset",
    deps=["setup_duckdb"],            # or ["setup_external_schema"] for external
    group_name="<producer_or_layer>",
    description="One-line purpose.",
    retry_policy=RetryPolicy(
        max_retries=Config.DAGSTER_RETRY_MAX_ATTEMPS,
        delay=Config.DAGSTER_RETRY_DELAY,
    ),
)
def my_new_asset(context: AssetExecutionContext, duckdb: DuckDBResource):
    with duckdb.get_connection() as conn:
        sql = "CREATE OR REPLACE TABLE external.foo AS SELECT …"
        context.log.info(f"Executing: {sql[:120]}")
        conn.execute(sql)
        n = conn.execute("SELECT COUNT(*) FROM external.foo").fetchone()[0]
        context.log.info(f"✅ Loaded {n:,} rows")
        return MaterializeResult(metadata={"row_count": n})
```

## Verification loop

1. **Import sanity**:
   ```bash
   cd analytics/dagster
   uv run python -c "from src import definitions; print(definitions.defs)"
   ```
2. **Validate definitions**:
   ```bash
   uv run dagster definitions validate -m src.definitions
   ```
3. **Materialize narrowly** (don't run the whole graph):
   ```bash
   uv run dagster asset materialize -m src.definitions --select my_new_asset
   ```
4. **Check downstream impact** if the asset feeds dbt:
   ```bash
   cd ../dbt && dbt parse && dbt compile --select +<downstream_stg_model>
   ```

## Anti-patterns (auto-flag)

- Creating a DuckDB connection with `duckdb.connect(...)` inline — use the
  resource.
- Hardcoding `motherduck_token=` in any string — go through `Config.MD_TOKEN`.
- New asset with no `group_name` — falls into `default`, hard to find in UI.
- `deps=[…]` referencing string keys that don't exist (typos break the graph
  silently at parse time).
- Mutating shared state (writing to `db/` in dev when `USE_MOTHER_DUCK=True`)
  — branch on `Config.USE_MOTHER_DUCK`.
- Adding a multi_asset that loops over a dict but forgets to `yield` per
  asset — only one asset will materialize.

## When to escalate

- The asset writes to dbt-managed schemas (`stg`, `int`, `marts`) → STOP.
  Those are owned by dbt; emit raw output to `external` instead and let dbt
  read it via a `source()`.
- New schedule needs different cadence than daily/yearly → discuss with user
  before adding (cadence affects ops cost on MotherDuck).
- New external source → use the dedicated `external-source-onboarding` skill.
