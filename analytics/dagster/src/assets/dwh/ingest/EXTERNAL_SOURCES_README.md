# External Data Sources Management

This document explains the architecture and best practices for managing external data sources in the Zero Logement Vacant data warehouse.

## Architecture Overview

### Current Structure

```
analytics/dagster/src/assets/dwh/ingest/
├── queries/
│   ├── external_sources_config.py  ← Centralized source definitions (ALL sources)
│   └── production.py               ← Production DB queries
├── ingest_external_sources_asset.py ← Unified external sources ingestion
├── ingest_postgres_asset.py        ← Postgres ingestion
└── administrative_cuts.py          ← API-based ingestion
```

## Unified Approach

All external data sources (S3-based and HTTP-based) are now managed through a single, centralized configuration:

- ✅ CEREMA LOVAC data (S3)
- ✅ CEREMA Fichiers Fonciers (FF) (S3)
- ✅ data.gouv.fr datasets (HTTP/Parquet)
- ✅ INSEE data (HTTP/CSV)
- ✅ DGALN data (HTTP/Parquet)
- ✅ URSSAF data (HTTP/CSV)
- ✅ DGFIP data (HTTP/CSV)

**Benefits:**

- Single source of truth for all external data
- Consistent naming convention: `external.(provider)_(name)_raw`
- Easy to add new sources
- Unified ingestion process
- Better maintainability

### Schema Convention

All tables are created in the `external` schema with the naming pattern:

```
external.(provider)_(name)_raw
```

**Examples:**
- `external.cerema_lovac_2024_raw`
- `external.cerema_ff_2024_raw`
- `external.dgaln_carte_loyers_2023_raw`
- `external.insee_grille_densite_raw`
- `external.urssaf_etablissements_effectifs_raw`

## Adding a New Source

To add a new external data source, simply add an entry to `external_sources_config.py`:

### CSV Example
```python
"my_new_source": {
    "url": "https://example.com/data.csv",
    "table_name": "external.provider_my_source_raw",
    "file_type": "csv",
    "description": "Description of my source",
    "producer": "PROVIDER_NAME",
    "type_overrides": {"column_name": "VARCHAR"},  # Optional
    "read_options": {"auto_detect": True, "delimiter": ";"},  # Optional
}
```

### Parquet Example
```python
"my_parquet_source": {
    "url": "https://example.com/data.parquet",
    "table_name": "external.provider_my_source_raw",
    "file_type": "parquet",
    "description": "Description of my parquet source",
    "producer": "PROVIDER_NAME",
    "type_overrides": None,
    "read_options": None,
}
```

### XLSX (Excel) Example
```python
"my_excel_source": {
    "url": "https://example.com/data.xlsx",
    "table_name": "external.provider_my_source_raw",
    "file_type": "xlsx",
    "description": "Description of my Excel source",
    "producer": "PROVIDER_NAME",
    "type_overrides": None,  # Not supported for XLSX
    "read_options": {
        "sheet": "Sheet1",         # Optional: specify sheet name (default: first sheet)
        "range": "A1:Z100",        # Optional: specific cell range
        "header": True,            # Optional: treat first row as header (auto-detected by default)
        "stop_at_empty": True,     # Optional: stop reading at first empty row
        "all_varchar": False,      # Optional: treat all cells as VARCHAR
        "ignore_errors": False,    # Optional: replace cast errors with NULL
    },
}
```

### Supported File Types
- **CSV** - Comma-separated values (using `read_csv`)
  - Options: `auto_detect`, `delimiter`, `quote`, `escape`, `header`, etc.
- **Parquet** - Columnar format (using `read_parquet`)
  - Minimal configuration needed
- **XLSX** - Excel files (using `read_xlsx`)
  - Options: `sheet`, `range`, `header`, `stop_at_empty`, `all_varchar`, `ignore_errors`, etc.
  - Note: `.xls` files are NOT supported, only `.xlsx`

The asset will be automatically created and available in Dagster!
- ✅ Other government open data

**Benefits:**

- Always up-to-date
- No storage costs
- No manual sync needed
- DuckDB can read directly from HTTP

**Trade-offs:**

- Dependency on external availability
- Potential for URL changes
- No historical snapshots

### 3. **API-Based Loading (Existing Pattern)**

Use for dynamic data and reference tables:

- ✅ Administrative boundaries (communes, EPCI, etc.)
- ✅ Frequently updated reference data

## Adding New Data Sources

### Step 1: Add Source to Configuration

Edit `queries/external_sources_config.py`:

```python
EXTERNAL_SOURCES: dict[str, SourceConfig] = {
    "your_source_name": {
        "url": "https://data.gouv.fr/path/to/file.parquet",
        "schema": "target_schema",  # e.g., "insee", "dgaln", "cerema"
        "table_name": "your_table_name",
        "file_type": "parquet",  # or "csv"
        "description": "Human-readable description",
        "producer": "PRODUCER_NAME",  # e.g., "INSEE", "DGALN"
        "type_overrides": {
            # Optional: force specific column types
            "column_name": "VARCHAR",
            "postal_code": "VARCHAR",
        },
        "read_options": {
            # Optional: DuckDB read options
            "auto_detect": True,
            "delimiter": ";",
            "ignore_errors": False,
        },
    },
}
```

### Step 2: Materialize the Asset

The asset is automatically created! Just run:

```bash
# Materialize a specific source
dagster asset materialize -m analytics.dagster.src.definitions --select raw_your_source_name

# Materialize all sources from a producer
dagster asset materialize -m analytics.dagster.src.definitions --select tag:producer=INSEE

# Materialize all external sources
dagster asset materialize -m analytics.dagster.src.definitions --select import_external_sources_to_duckdb+
```

### Step 3: Reference in DBT

Create a source definition in DBT (`dbt/models/staging/externals/sources/`):

```yaml
# dbt/models/staging/externals/sources/insee.yml
version: 2

sources:
  - name: insee
    schema: insee
    tables:
      - name: your_table_name
        description: "Your description"
        meta:
          dagster_asset_key: raw_your_source_name
```

Then create staging models as usual:

```sql
-- dbt/models/staging/externals/stg_insee__your_table.sql
with source as (
    select * from {{ source('insee', 'your_table_name') }}
)
select * from source
```

## Best Practices

### 1. **Organize by Producer**

Use the `producer` field to group related sources:

- `INSEE` for Institut National de la Statistique
- `DGALN` for Direction Générale de l'Aménagement
- `CEREMA` for Centre d'études et d'expertise
- `URSSAF` for Union de Recouvrement
- `DGFIP` for Direction Générale des Finances Publiques

This creates logical groupings in the Dagster UI.

### 2. **Use Meaningful Schema Names**

Create separate schemas for each producer:

```python
"schema": "insee",      # ✅ Good
"schema": "external",   # ❌ Too vague
```

### 3. **Document Everything**

Always provide:

- `description`: What the data contains
- `producer`: Who publishes it
- Source URL in the config

### 4. **Handle Data Quality**

For unreliable sources, use:

```python
"read_options": {
    "auto_detect": True,
    "ignore_errors": True,  # Skip bad rows
    "max_line_size": 1000000,  # For large text fields
}
```

### 5. **Type Overrides for Common Issues**

French data often has these issues:

```python
"type_overrides": {
    "code_postal": "VARCHAR",      # ZIP codes with leading zeros
    "code_commune": "VARCHAR",      # INSEE codes with leading zeros
    "code_departement": "VARCHAR",  # Department codes like "01", "2A"
    "siret": "VARCHAR",            # 14-digit business IDs
    "siren": "VARCHAR",            # 9-digit business IDs
}
```

## Finding Data Sources

### 1. data.gouv.fr

Browse: <https://www.data.gouv.fr>

**Getting Direct Download Links:**

1. Find your dataset
2. Click on the file you want
3. Right-click "Télécharger" → Copy link address
4. Look for URLs like:
   - `https://object.files.data.gouv.fr/...`
   - `https://static.data.gouv.fr/...`

### 2. INSEE

Browse: <https://www.insee.fr/fr/statistiques>

Files are often in CSV format with `;` delimiter.

### 3. CEREMA

Browse: <https://datafoncier.cerema.fr>

Some datasets require authentication or manual download.

### 4. Determining File Schemas

**For Parquet files:**

```python
import duckdb
conn = duckdb.connect()
print(conn.execute("DESCRIBE SELECT * FROM 'https://url/to/file.parquet'").fetchall())
```

**For CSV files:**

```python
import duckdb
conn = duckdb.connect()
# Let DuckDB auto-detect
print(conn.execute("SELECT * FROM read_csv('url', auto_detect=true) LIMIT 5").fetchall())
```

## Complete Example: Adding INSEE Grille Densité

### 1. Find the data

Go to: <https://www.insee.fr/fr/information/6439600>

### 2. Get the direct link

Right-click → Copy: `https://www.insee.fr/fr/statistiques/fichier/6439600/grille_densite_7_niveaux_2023.xlsx`

### 3. Add to config

```python
"insee_grille_densite": {
    "url": "https://www.insee.fr/fr/statistiques/fichier/6439600/grille_densite_7_niveaux_2023.xlsx",
    "schema": "insee",
    "table_name": "grille_densite",
    "file_type": "csv",  # Note: DuckDB can read Excel too!
    "description": "Grille de densité INSEE - 7 niveaux (2023)",
    "producer": "INSEE",
    "type_overrides": {
        "CODGEO": "VARCHAR",
    },
    "read_options": {
        "auto_detect": True,
        "sheet": "Communes",  # For Excel files
    },
},
```

### 4. Test locally

```bash
cd analytics/dagster
dagster asset materialize --select raw_insee_grille_densite
```

### 5. Create DBT source

```yaml
# dbt/models/staging/externals/sources/insee.yml
sources:
  - name: insee
    schema: insee
    tables:
      - name: grille_densite
        description: "Grille de densité INSEE"
```

### 6. Create staging model

```sql
-- dbt/models/staging/externals/stg_insee__grille_densite.sql
with source as (
    select * from {{ source('insee', 'grille_densite') }}
),

renamed as (
    select
        codgeo as code_commune,
        libgeo as nom_commune,
        -- ... other columns
    from source
)

select * from renamed
```

## Troubleshooting

### Issue: "HTTP Error 403 Forbidden"

Some sites block user agents. This is rare for government data, but if it happens, you may need to download manually and upload to S3.

### Issue: "CSV parsing error"

Try adjusting read options:

```python
"read_options": {
    "auto_detect": False,
    "delimiter": ";",
    "quote": '"',
    "escape": '"',
    "header": True,
}
```

### Issue: "Column type mismatch"

Add type overrides for problematic columns:

```python
"type_overrides": {
    "problematic_column": "VARCHAR",
}
```

### Issue: "File format not supported"

DuckDB supports:

- CSV, TSV
- Parquet
- JSON
- Excel (limited)

For other formats (shapefiles, etc.), you'll need a separate ingestion script.

## Migration from S3

If you want to migrate existing S3-based sources to direct loading:

1. **Check if the original URL is still available**
2. **Test direct loading** with a small sample
3. **Update the config** to use the URL instead of S3
4. **Remove from S3** after confirming it works
5. **Update DBT sources** if schema/table names changed

## Questions?

See the Dagster logs for detailed information about each ingestion:

- Table created successfully?
- How many rows loaded?
- Any errors?

Check the DBT documentation for downstream transformations.

