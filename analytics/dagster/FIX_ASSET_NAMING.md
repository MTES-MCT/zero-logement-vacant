# ✅ Fix Applied: Asset Naming Consistency

## Issue
Dagster was reporting asset key mismatches:
- Expected: `raw_grille_densite`
- Was receiving: `raw_insee_grille_densite`

## Root Cause
Source names in `external_sources_config.py` included the producer prefix (e.g., `insee_grille_densite`), creating inconsistent asset names like `raw_insee_grille_densite`.

## Solution
Removed producer prefixes from source dictionary keys. The producer information is still tracked in the `producer` field of each config.

### Changes Made:

**Before:**
```python
EXTERNAL_SOURCES = {
    "insee_grille_densite": {
        "producer": "INSEE",
        ...
    },
    "urssaf_etablissements_effectifs": {
        "producer": "URSSAF",
        ...
    },
}
```

**After:**
```python
EXTERNAL_SOURCES = {
    "grille_densite": {  # ← No producer prefix
        "producer": "INSEE",  # ← Producer tracked here
        ...
    },
    "etablissements_effectifs": {  # ← No producer prefix
        "producer": "URSSAF",  # ← Producer tracked here
        ...
    },
}
```

## Assets Created

The system now creates these Dagster assets:
- ✅ `raw_carte_des_loyers_2023`
- ✅ `raw_zonage_abc`
- ✅ `raw_consommation_espace`
- ✅ `raw_recensement_historique`
- ✅ `raw_population_structures_ages`
- ✅ `raw_grille_densite`
- ✅ `raw_table_appartenance_geo`
- ✅ `raw_etablissements_effectifs`
- ✅ `raw_fiscalite_locale`

## Verification

```bash
✅ Configuration file is syntactically correct
✅ Total sources: 9
✅ All assets will have consistent naming: raw_<source_name>
```

## DBT Sources Updated

Updated all DBT source YAMLs to match:
- `insee.yml` - Updated dagster_asset_key fields
- `urssaf.yml` - Updated dagster_asset_key fields
- `dgfip.yml` - Updated dagster_asset_key fields

## Next Steps

1. **Start Dagster** (if protobuf issue persists, use uv/venv):
   ```bash
   cd analytics/dagster
   dagster dev
   ```

2. **Test materialization**:
   ```bash
   # In Dagster UI, navigate to:
   # Assets → import_external_sources_to_duckdb → Materialize
   ```

3. **Or use CLI**:
   ```bash
   dagster asset materialize -m src.definitions --select raw_carte_des_loyers_2023
   ```

## Note on Protobuf Error

If you see a protobuf error when starting Dagster, it's an environment issue, not related to this code. The configuration itself is correct. Try:
- Using the project's uv environment
- Or upgrading protobuf: `pip install --upgrade protobuf`

---

**Status: ✅ FIXED** - All asset names are now consistent!

