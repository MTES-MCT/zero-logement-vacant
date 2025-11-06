# Quick Start Guide: Adding External Data Sources

This guide walks you through adding a new external data source to your data warehouse in **5 simple steps**.

## Prerequisites

- Python 3.11+
- Dagster dev environment
- DBT environment
- Access to DuckDB/MotherDuck

## Step-by-Step Guide

### Step 1: Find Your Data Source URL

1. Go to the data provider website (e.g., data.gouv.fr, INSEE)
2. Find the dataset you want
3. Get the **direct download link** (not the webpage URL)

**Example for data.gouv.fr:**
```bash
# Test the URL is accessible
curl -I "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/0de53e33c5b555111ffaf7a9849540c7.parquet"

# Expected: HTTP/1.1 200 OK
```

**Tip:** Right-click on the download button → "Copy link address"

---

### Step 2: Add Source to Configuration

Edit: `analytics/dagster/src/assets/dwh/ingest/queries/external_sources_config.py`

```python
EXTERNAL_SOURCES: dict[str, SourceConfig] = {
    # ... existing sources ...
    
    "my_new_source": {
        "url": "https://your-url-here.parquet",
        "schema": "producer_name",  # e.g., "insee", "dgaln"
        "table_name": "descriptive_table_name",
        "file_type": "parquet",  # or "csv"
        "description": "Clear description of what this data contains",
        "producer": "PRODUCER_NAME",  # e.g., "INSEE", "DGALN"
        "type_overrides": {
            # Force VARCHAR for codes with leading zeros
            "code_commune": "VARCHAR",
            "code_postal": "VARCHAR",
        },
        "read_options": {
            # CSV-specific options
            "auto_detect": True,
            "delimiter": ";",  # French CSVs often use semicolon
            "ignore_errors": False,
        },
    },
}
```

---

### Step 3: Validate Your Configuration

```bash
cd analytics/dagster

# Validate the URL is accessible
python src/assets/dwh/ingest/validate_sources.py my_new_source

# Test DuckDB can load it
python src/assets/dwh/ingest/validate_sources.py my_new_source --test-loading
```

**Expected output:**
```
================================================================================
Source: my_new_source
================================================================================
Producer:    PRODUCER_NAME
Schema:      producer_name
Table:       descriptive_table_name
...
Checking URL accessibility...
  ✅ Accessible

Testing DuckDB loading (first 100 rows)...
  ✅ Loaded 100 rows (sample)
```

---

### Step 4: Materialize the Dagster Asset

```bash
cd analytics/dagster

# Materialize your specific source
dagster asset materialize -m src.definitions --select raw_my_new_source

# Or use the Dagster UI
dagster dev
# Then go to: http://localhost:3000
# Navigate to Assets → raw_my_new_source → Materialize
```

**Check the logs:**
- Table created successfully?
- How many rows were loaded?
- Any errors?

---

### Step 5: Create DBT Source and Staging Model

#### 5a. Create DBT Source Definition

Create or edit: `analytics/dbt/models/staging/externals/sources/<producer>.yml`

```yaml
version: 2

sources:
  - name: producer_name
    description: "Data from <Producer Full Name>"
    schema: producer_name
    tables:
      - name: descriptive_table_name
        description: "Your description"
        meta:
          dagster_asset_key: raw_my_new_source
          producer: PRODUCER_NAME
        columns:
          - name: key_column
            description: "Description"
            tests:
              - not_null
              - unique
```

#### 5b. Create Staging Model

Create: `analytics/dbt/models/staging/externals/stg_<producer>__<table>.sql`

```sql
{{
    config(
        materialized='view',
        tags=['external', 'producer_name']
    )
}}

with source as (
    select * from {{ source('producer_name', 'descriptive_table_name') }}
),

renamed as (
    select
        -- Rename columns to standard naming
        column_a as standard_name_a,
        column_b as standard_name_b,
        cast(date_column as date) as date_standard,
        
        -- Add metadata
        current_timestamp as _loaded_at
    from source
)

select * from renamed
```

#### 5c. Test with DBT

```bash
cd analytics/dbt

# Test the source
dbt run --select stg_<producer>__<table>

# Run tests
dbt test --select stg_<producer>__<table>
```

---

## Complete Example: Adding INSEE Grille Densité

### Real-World Example

```python
# Step 2: Add to external_sources_config.py
"insee_grille_densite": {
    "url": "https://www.insee.fr/fr/statistiques/fichier/6439600/grille_densite.csv",
    "schema": "insee",
    "table_name": "grille_densite",
    "file_type": "csv",
    "description": "Grille de densité INSEE - 7 niveaux (2023)",
    "producer": "INSEE",
    "type_overrides": {
        "CODGEO": "VARCHAR",
    },
    "read_options": {
        "auto_detect": True,
        "delimiter": ";",
    },
},
```

```bash
# Step 3: Validate
python src/assets/dwh/ingest/validate_sources.py insee_grille_densite --test-loading

# Step 4: Materialize
dagster asset materialize -m src.definitions --select raw_insee_grille_densite
```

```yaml
# Step 5a: Create DBT source (insee.yml)
sources:
  - name: insee
    schema: insee
    tables:
      - name: grille_densite
        description: "Grille de densité INSEE"
        meta:
          dagster_asset_key: raw_insee_grille_densite
```

```sql
-- Step 5b: Create staging model (stg_insee__grille_densite.sql)
with source as (
    select * from {{ source('insee', 'grille_densite') }}
),

renamed as (
    select
        codgeo as code_commune,
        libgeo as nom_commune,
        cast(niveau_densite as integer) as niveau_densite,
        current_timestamp as _loaded_at
    from source
)

select * from renamed
```

---

## Common Issues & Solutions

### Issue: "URL returns 403 Forbidden"
**Solution:** The website may block automated requests. Download manually and upload to S3.

### Issue: "CSV parsing error"
**Solution:** Check the delimiter and encoding:
```python
"read_options": {
    "delimiter": ";",
    "encoding": "UTF-8",
    "quote": '"',
    "escape": '"',
}
```

### Issue: "Code INSEE lost leading zeros"
**Solution:** Add type override:
```python
"type_overrides": {
    "code_insee": "VARCHAR",
    "code_postal": "VARCHAR",
}
```

### Issue: "DuckDB can't read Excel file"
**Solution:** For complex Excel files, use a Python script to convert to CSV first, or look for a CSV export from the source.

---

## Tips for Finding Direct URLs

### data.gouv.fr
- Click on the dataset
- Click on the file resource
- Right-click "Télécharger" → Copy link
- URL format: `https://object.files.data.gouv.fr/...`

### INSEE
- Go to the dataset page
- Look for "Télécharger" or "Export"
- Copy the direct link (usually CSV or Excel)
- URL format: `https://www.insee.fr/fr/statistiques/fichier/...`

### URSSAF Open Data
- Use the "Export" tab
- Select format (CSV, JSON, etc.)
- Copy the API URL
- URL format: `https://open.urssaf.fr/explore/dataset/.../download/`

---

## Next Steps

After adding your source:

1. **Document it**: Update `DATA_SOURCES_CATALOG.md` with status 🟢
2. **Schedule it**: Add to Dagster schedule if it needs regular updates
3. **Create marts**: Build intermediate and mart models in DBT
4. **Add tests**: Ensure data quality with DBT tests
5. **Monitor**: Check Dagster logs regularly for issues

---

## Getting Help

- **Documentation**: See `EXTERNAL_SOURCES_README.md` for detailed info
- **Validation**: Use `validate_sources.py` to test configurations
- **Catalog**: Check `DATA_SOURCES_CATALOG.md` for all sources
- **DBT docs**: Run `dbt docs generate && dbt docs serve`

---

## Checklist

Use this checklist when adding a new source:

- [ ] Found direct download URL
- [ ] Tested URL accessibility (`curl -I`)
- [ ] Added to `external_sources_config.py`
- [ ] Validated configuration (`validate_sources.py`)
- [ ] Materialized asset in Dagster
- [ ] Created DBT source YAML
- [ ] Created DBT staging model
- [ ] Tested DBT model (`dbt run --select`)
- [ ] Added DBT tests
- [ ] Updated `DATA_SOURCES_CATALOG.md`
- [ ] Documented any special considerations

**Congratulations! Your new data source is now part of the data warehouse! 🎉**


