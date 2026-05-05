---
name: external-source-onboarding
description: >
  Use to onboard a new external dataset (data.gouv.fr, INSEE, DGFIP, DGALN,
  CEREMA, URSSAF, S3 Cellar) into the ZLV warehouse end-to-end: register the
  source, validate, materialize via Dagster, and expose to dbt. Trigger
  phrases: "add a new external source", "ingest a new dataset", "onboard
  data.gouv.fr file", "register a CEREMA file".
---

# Skill: Onboard a new external source

Canonical reference: `analytics/dagster/QUICK_START.md`. This skill condenses
that into the must-do steps with ZLV-specific guardrails.

## Step 1 — Identify the URL

Get the **direct download** URL (not the dataset web page).
- data.gouv.fr → right-click "Télécharger" → copy link
  (`https://object.files.data.gouv.fr/...`)
- INSEE → "Télécharger" / "Export"
  (`https://www.insee.fr/fr/statistiques/fichier/...`)
- URSSAF → Export tab → API URL
  (`https://open.urssaf.fr/explore/dataset/.../download/`)
- CEREMA private S3 → `s3://<bucket>/<key>` (Cellar credentials in `Config`)

```bash
curl -I "<URL>"   # expect 200 OK
```

## Step 2 — Register in `EXTERNAL_SOURCES`

Edit
`analytics/dagster/src/assets/dwh/ingest/queries/external_sources_config.py`:

```python
"<source_name>": {
    "url": "https://...",
    "schema": "<producer_lower>",         # insee, dgaln, cerema, urssaf, dgfip
    "table_name": "<descriptive_name>",   # final table in external schema
    "file_type": "parquet",               # or "csv" / "xlsx"
    "description": "Clear sentence about what this contains.",
    "producer": "<PRODUCER>",             # uppercase: INSEE, DGALN, etc.
    "type_overrides": {
        "code_commune": "VARCHAR",        # preserve leading zeros
        "code_postal": "VARCHAR",
    },
    "read_options": {                     # CSV-specific
        "auto_detect": True,
        "delimiter": ";",                 # French CSVs commonly use ;
        "ignore_errors": False,
    },
},
```

The asset key will be `<source_name>` (not the table name). The dbt-side
`source()` reference will be `raw_<source_name>` via the
`CustomizedDagsterDbtTranslator`.

## Step 3 — Validate

```bash
cd analytics/dagster
uv run python src/assets/dwh/ingest/validate_sources.py <source_name>
uv run python src/assets/dwh/ingest/validate_sources.py <source_name> --test-loading
```

Both must pass before moving on.

## Step 4 — Materialize

```bash
cd analytics/dagster
uv run dagster asset materialize -m src.definitions --select <source_name>
```

Or via Dagster UI (`dagster dev` → http://localhost:3000 → Assets).

Confirm `external.<table_name>` exists on MotherDuck `dwh`:

```
mcp__MotherDuck__list_tables(database="dwh", schema="external")
mcp__MotherDuck__query("SELECT COUNT(*) FROM dwh.external.<table_name>")
```

## Step 5 — Expose to dbt

### 5a — Source declaration

Create or edit
`analytics/dbt/models/staging/<domain>/sources/<producer>.yml`:

```yaml
version: 2

sources:
  - name: <producer_lower>
    description: "Data from <Producer Full Name>"
    schema: <producer_lower>
    tables:
      - name: <table_name>
        description: "..."
        meta:
          dagster_asset_key: raw_<source_name>   # required for Dagster wiring
          producer: <PRODUCER>
        columns:
          - name: <key_column>
            tests: [not_null, unique]
```

### 5b — Staging model

Create
`analytics/dbt/models/staging/<domain>/stg_<producer>__<table>.sql`:

```sql
{{ config(materialized='view', tags=['external', '<producer_lower>']) }}

with source as (
    select * from {{ source('<producer_lower>', '<table_name>') }}
),

renamed as (
    select
        codgeo  as code_commune,
        libgeo  as nom_commune,
        cast(niveau_densite as integer) as niveau_densite,
        current_timestamp as _loaded_at
    from source
)

select * from renamed
```

### 5c — Test

```bash
cd analytics/dbt
dbt run --select stg_<producer>__<table>
dbt test --select stg_<producer>__<table>
```

## Step 6 — Document and schedule

- Update `analytics/dagster/DATA_SOURCES_CATALOG.md` (status 🟢 in production).
- If the source needs a cadence different from `@yearly`, propose a new
  `ScheduleDefinition` in `definitions.py` rather than changing the existing
  yearly schedule.
- Confirm the new asset is included in
  `yearly_update_all_external_sources_job` (it auto-includes via
  `*list(EXTERNAL_SOURCES.keys())` — no edit needed unless you want a
  different cadence).

## Common pitfalls

- **`403 Forbidden`** on the URL → website blocks bots. Mirror to S3 Cellar
  and switch the URL to `s3://`.
- **Leading zeros lost** on INSEE codes → set `type_overrides`.
- **CSV parsing fails** → tweak `read_options` (`delimiter`, `encoding`,
  `quote`, `escape`).
- **XLSX from HTTP** → handled by `_download_file` then read locally
  (DuckDB's `read_xlsx` doesn't accept remote URLs).
- **Forgot `meta.dagster_asset_key`** → dbt won't link to the upstream Dagster
  asset; manifest builds but lineage is broken.

## Done checklist

- [ ] URL returns 200
- [ ] `EXTERNAL_SOURCES` entry added
- [ ] `validate_sources.py … --test-loading` passes
- [ ] Asset materializes; row count > 0
- [ ] `<producer>.yml` source declared with `meta.dagster_asset_key`
- [ ] `stg_<producer>__<table>.sql` created with `_loaded_at`
- [ ] `dbt run` + `dbt test` for the staging model are green
- [ ] `DATA_SOURCES_CATALOG.md` updated
