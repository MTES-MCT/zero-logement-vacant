# Import Establishments Scripts

Python scripts for managing establishments in ZLV.

## Prerequisites

```bash
cd server/src/scripts/import-establishments
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Execution Order

**Important**: Follow this order when updating to a new vintage (millésime):

1. **Update localities** (commune fusions/splits)
2. **Import establishments** (validates geo_codes against localities)
3. **Detect orphans** (obsolete establishments)

## Scripts

### 1. update_localities.py

Updates the `localities` table with INSEE code changes (fusions/splits).

```bash
# Dry-run
python ../update-localities/update_localities.py \
  --excel table_passage_annuelle_2025.xlsx \
  --db-url postgresql://user:pass@host:port/db \
  --dry-run

# Execute
python ../update-localities/update_localities.py \
  --excel table_passage_annuelle_2025.xlsx \
  --db-url postgresql://user:pass@host:port/db
```

### 2. import_gold_establishments.py

Imports establishments from the Gold Layer CSV.

```bash
# Dry-run
python import_gold_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --dry-run

# Import with limit
python import_gold_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --limit 100

# Full import
python import_gold_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db
```

### 3. detect_orphan_establishments.py

Detects establishments in DB but missing from CSV (orphans).

```bash
# Report only
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db

# Export orphans to CSV
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --output orphans.csv

# Delete safe orphans (no users/campaigns)
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --delete

# Migrate data from one establishment to another
python detect_orphan_establishments.py \
  --csv collectivities_processed.csv \
  --db-url postgresql://user:pass@host:port/db \
  --migrate-from 123456789 \
  --migrate-to 987654321
```

### 4. check_uniqueness.py

Checks SIREN/SIRET uniqueness in CSV files before import.

```bash
python check_uniqueness.py
```

## Tests

```bash
# All tests
pytest -v

# Specific tests
pytest test_import_gold_establishments.py -v
pytest test_detect_orphan_establishments.py -v

# Test by name
pytest -v -k "test_parse_siren"
```

## Documentation

- [ANALYSIS.md](ANALYSIS.md) - Schema analysis and import plan
- [ORPHAN_ESTABLISHMENTS_REPORT.md](ORPHAN_ESTABLISHMENTS_REPORT.md) - Detected orphans report
- [../../docs/database/establishments.md](../../docs/database/establishments.md) - `kind` values documentation
