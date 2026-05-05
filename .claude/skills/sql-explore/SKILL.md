---
name: sql-explore
description: >
  Use to investigate the ZLV data warehouse on MotherDuck (`dwh`) — list tables,
  inspect columns, run scoped queries, profile distributions, validate KPIs.
  Trigger phrases: "explore data", "check the warehouse", "how many rows",
  "what's the distribution of …".
---

# Skill: Explore the ZLV data warehouse

> Connection: MotherDuck database `dwh`. Use the `mcp__MotherDuck__*` tools —
> they're allow-listed and don't require auth re-prompts. Avoid spinning up a
> local `duckdb` shell unless the MCP is unavailable.

## Schema map

| Schema | Contents | Prefix |
|---|---|---|
| `main_marts` | Final BI tables | `marts_*` |
| `main_int` | Intermediate (joins, agg) | `int_*` |
| `main_stg` | Staging (1-to-1 with source) | `stg_*` |
| `external` | Raw external sources | `<producer>_<table>_raw` |
| `production` | Sourced PostgreSQL prod | (raw entity names) |

Reference table groups in `analytics/dagster/src/config.py`:
`production_tables`, `join_tables`, `common_tables`, `public_tables`,
`admin_tables`, `analysis_tables`.

## Standard recipe

1. **List tables** when unsure of the name:
   ```
   mcp__MotherDuck__list_tables(database="dwh", schema="main_marts")
   ```
2. **Inspect columns** before writing a query:
   ```
   mcp__MotherDuck__list_columns(
     database="dwh", schema="main_marts", table="marts_production_housing"
   )
   ```
3. **Always cap exploration queries**:
   ```sql
   SELECT … FROM dwh.main_marts.marts_production_housing LIMIT 100;
   ```
4. **Profile distributions** before aggregating:
   ```sql
   SELECT col, COUNT(*) AS n
   FROM dwh.main_int.int_production_housing_last_status
   GROUP BY col
   ORDER BY n DESC
   LIMIT 50;
   ```
5. **Validate KPIs** against `marts_stats_monthly_global` baseline before
   proposing a model change.

## Useful starter queries

```sql
-- Volume by main mart
SELECT 'housing' AS t, COUNT(*) FROM dwh.main_marts.marts_production_housing
UNION ALL SELECT 'establishments', COUNT(*)
  FROM dwh.main_marts.marts_production_establishments WHERE is_active
UNION ALL SELECT 'campaigns', COUNT(*)
  FROM dwh.main_marts.marts_production_campaigns WHERE is_sent = 1;

-- Last-status distribution
SELECT last_event_status_label_user_followup AS status, COUNT(*) AS n
FROM dwh.main_int.int_production_housing_last_status
WHERE last_event_status_label_user_followup IS NOT NULL
GROUP BY 1 ORDER BY n DESC;

-- External source row count
SELECT COUNT(*) FROM dwh.external.cerema_lovac_2026_raw;
```

## DuckDB SQL idioms worth knowing

- `FROM <table>` (no SELECT) — quick scan.
- `SELECT * EXCLUDE (col)` and `SELECT * REPLACE (UPPER(name) AS name)`.
- `SELECT COLUMNS('regex_.*') FROM …` for pattern column selection.
- `GROUP BY ALL` and `ORDER BY ALL`.
- `UNION BY NAME` to align disparate column sets.
- `read_parquet('s3://…')` and `read_csv_auto('https://…')` for ad-hoc reads.
- `qualify` for window-function filtering without subquery.

## Discipline

- **Never** run `query_rw` / `INSERT` / `UPDATE` / `DROP` against `dwh` from
  exploration. Mutations go through dbt + Dagster.
- Summarize results > 100 rows; don't dump the full result set into the chat.
- If a query is slow (>30s), stop and add filters or sample first.
- Confirm credentials are loaded via env (`MD_TOKEN` / `ZLV_MD_TOKEN`) before
  invoking a Bash duckdb fallback.
