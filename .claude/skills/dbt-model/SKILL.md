---
name: dbt-model
description: >
  Use when adding or modifying a dbt model in `analytics/dbt/`. Enforces ZLV
  layer/naming rules, ref()/source() discipline, schema.yml docs+tests, and a
  compile→run→test verification loop. Trigger phrases: "add a dbt model",
  "modify staging/intermediate/marts", "create stg_/int_/marts_…".
---

# Skill: Add or modify a dbt model

> Read first: `analytics/dbt/CLAUDE.md`, `analytics/dbt/SKILL.md`.

## Decide the layer

| Need | Layer | Prefix | Materialization | Schema |
|---|---|---|---|---|
| Mirror a source 1-to-1, rename/cast | staging | `stg_` | view | `stg` |
| Join, aggregate, business logic | intermediate | `int_` | view | `int` |
| Final BI/reporting table | marts | `marts_` | table | `marts` |

Domain folders: `production`, `external`, `lovac`, `ff`, `analysis`, `common`,
`zlovac`, `zff`.

Final name: `{layer}_{domain}_{entity}_{suffix?}`.

## Checklist

1. **Explore current data shape** with the MotherDuck MCP before writing SQL:
   ```
   mcp__MotherDuck__list_columns(database="dwh", schema="main_int", table="<upstream>")
   mcp__MotherDuck__query("SELECT … FROM dwh.main_<schema>.<table> LIMIT 100")
   ```
2. **Write the failing test first** (TDD) when adding a new invariant:
   - Simple: `tests:` block in the folder's `schema.yml`
     (`unique`, `not_null`, `accepted_values`, `relationships`,
     `dbt_expectations.expect_…`).
   - Complex: `tests/<domain>/<topic>/test_<name>.sql` returning rows-on-failure.
   Run `dbt test --select <name>` and confirm RED.
3. **Create the SQL file** in the right folder. Template:
   ```sql
   {{ config(materialized='view') }}  -- or 'table' for marts

   with source as (
       select * from {{ ref('upstream_model') }}
       -- or {{ source('producer', 'table') }} for stg only
   ),

   transformed as (
       select
           id,
           col_a,
           cast(col_b as date) as col_b_date,
           current_timestamp as _loaded_at
       from source
       where col_a is not null
   )

   select * from transformed
   ```
4. **Document in `schema.yml`** (same folder):
   ```yaml
   - name: <model_name>
     description: "<what this model represents, business meaning>"
     columns:
       - name: id
         description: "Primary key"
         tests: [unique, not_null]
       - name: <other>
         description: "..."
   ```
5. **Reuse macros** instead of reimplementing:
   - `get_last_event_status(user_source, event_name)` for events
   - `select_last_event(ref, cte_name, suffix)` for last-row selection
   - `process_return_rate_for_campaigns(n_month, check_next_campaign)`
   - `dbt_utils.generate_surrogate_key([…])` for composite PKs
6. **Verify (must all pass before claiming done):**
   ```bash
   cd analytics/dbt
   dbt parse
   dbt compile --select <model>
   dbt run --select +<model>      # build upstream + the model
   dbt test --select <model>
   ```
7. **For new sources**: declare in
   `models/staging/<domain>/sources/<producer>.yml` with
   `meta.dagster_asset_key: raw_<source_name>` so Dagster wires it.

## Anti-patterns (auto-flag)

- Hardcoded table names (`from production.housing`) → use `ref()` / `source()`.
- Marts model materialized as `view` (or staging as `table`) without justification.
- New model without `schema.yml` entry.
- New model without primary key test.
- `SELECT *` in the final select of an intermediate or mart (acceptable in
  staging "renamed" CTE, not as the final shape).
- Hardcoded date strings — use `vars.startDate` or `dbt_date` macros.

## When to escalate

If the change touches:
- Dagster assets / `EXTERNAL_SOURCES` → invoke the `data-engineer` agent.
- A KPI in `marts_stats_monthly_global` → run regression tests in
  `tests/production/stats/` and surface deltas to the user.
