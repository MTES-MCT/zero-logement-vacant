# DPE Import - Complete Guide

This guide explains how to download and import DPE (Energy Performance Diagnostic) data from ADEME into PostgreSQL.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [Prerequisites](#prerequisites)
- [DPE Raw Import - Details](#dpe-raw-import---details)
- [DPE Buildings Import](#dpe-buildings-import)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Additional Documentation](#additional-documentation)

---

## Overview

This directory contains 3 main scripts:

1. **`import-ademe.py`** - Downloads DPE data from ADEME API
2. **`import_dpe_raw.py`** - Imports raw DPE data (224 fields) into `dpe_raw` table
3. **`import-dpe.py`** - Imports enriched DPE data into `buildings` table

### Which script to use?

**Just starting?** Follow the [Quick Start](#quick-start) section below.

**Need to understand the workflow?** See all scripts in the [Available Scripts](#available-scripts) section.

**Have a problem?** Check the [Troubleshooting](#troubleshooting) section.

**Want to learn about coordinates?** Read [SPATIAL_INDEX_NOTE.md](SPATIAL_INDEX_NOTE.md)

---

## Quick Start

### 🚀 DPE Raw Import (ALL 224 fields)

```bash
cd server/src/scripts/import-dpe

# 1️⃣ Generate SQL schema
python3 generate_schema.py dpe_data_complete.jsonl

# 2️⃣ Create the table
export DATABASE_URL="postgresql://user:password@localhost:5432/database"
psql "$DATABASE_URL" -f create_dpe_raw_table_complete.sql

# 3️⃣ Import the data
python3 import_dpe_raw.py dpe_data_complete.jsonl --db-url "$DATABASE_URL"
```

**Expected output:**
```
✅ SQL schema written to: create_dpe_raw_table_complete.sql
✅ Field list written to: dpe_raw_fields.py
Total unique fields found: 224
```

### Useful Options

```bash
# Quick test (1 department, 1000 rows)
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --department 75 \
  --limit 1000 \
  --db-url "$DATABASE_URL"

# Sequential import (recommended for debugging)
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --sequential \
  --db-url "$DATABASE_URL"

# Parallel import with 8 workers
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --max-workers 8 \
  --db-url "$DATABASE_URL"
```

---

## Available Scripts

### 1. `generate_schema.py` 🆕

Automatically generates SQL schema from your JSON data.

**Usage:**
```bash
# Analyze 10,000 records (default, fast)
python3 generate_schema.py dpe_data_complete.jsonl

# Analyze more records for better detection
python3 generate_schema.py dpe_data_complete.jsonl --sample-size 50000

# Analyze entire file (slow)
python3 generate_schema.py dpe_data_complete.jsonl --sample-size 0
```

**Generated files:**
- `create_dpe_raw_table_complete.sql` - PostgreSQL schema with all fields
- `dpe_raw_fields.py` - Python field definitions for import

**Duration:** ~30 seconds for 10,000 records

---

### 2. `import-ademe.py`

Downloads DPE data from ADEME API.

**Prerequisites:**
- ADEME API key (get one at [data.ademe.fr](https://data.ademe.fr))

**Usage:**
```bash
# With environment variable (recommended)
export ADEME_API_KEY="your_api_key_here"
python import-ademe.py

# Or with argument
python import-ademe.py --api-key YOUR_API_KEY

# With custom options
python import-ademe.py \
  --api-key YOUR_API_KEY \
  --output-file custom_output.jsonl \
  --limit-per-page 5000 \
  --max-pages 100
```

**Features:**
- Automatic resume after interruption
- JSON Lines streaming
- Automatic retry on errors

---

### 3. `import_dpe_raw.py`

Imports **ALL 224 DPE fields** into `dpe_raw` table.

**Features:**
- ✅ Imports ALL fields (not just 20)
- ✅ Parallel or sequential processing
- ✅ Automatic duplicate handling
- ✅ Automatic resume if interrupted
- ✅ Dry-run mode for testing

**Usage:**
```bash
# Full import (all departments in parallel)
python3 import_dpe_raw.py dpe_data_complete.jsonl --db-url "$DATABASE_URL"

# Sequential import (one department at a time)
python3 import_dpe_raw.py dpe_data_complete.jsonl --sequential --db-url "$DATABASE_URL"

# Import single department
python3 import_dpe_raw.py dpe_data_complete.jsonl --department 75 --db-url "$DATABASE_URL"

# Resume from specific department
python3 import_dpe_raw.py dpe_data_complete.jsonl --sequential --start-department 50 --db-url "$DATABASE_URL"

# Dry-run (test without insertion)
python3 import_dpe_raw.py dpe_data_complete.jsonl --department 69 --limit 1000 --dry-run --db-url "$DATABASE_URL"
```

**Available options:**
- `--department` / `--dept` : Process single department (e.g., 75, 01, 2A)
- `--start-department` : Resume from specific department
- `--sequential` : Sequential import instead of parallel
- `--max-workers` : Number of parallel workers (default: 6)
- `--batch-size` : SQL batch size (default: 2000)
- `--limit` : Limit number of rows to process
- `--dry-run` : Simulation mode (no DB modification)
- `--debug` : Enable debug mode

**Estimated duration:** 2-4 hours for all of France (depending on configuration)

---

### 4. `import-dpe.py`

Imports enriched DPE data into `buildings` table.

**Matching strategy:**
1. **Case 1**: Direct match via RNB ID
   - 1.1: Building DPE (apartment building or house)
   - 1.2: Apartment DPE
2. **Case 2**: Match via BAN address → Plot → Building
   - 2.1: Building DPE
   - 2.2: Apartment DPE

**Usage:**
```bash
# Full import
python import-dpe.py dpe_data_complete.jsonl \
  --db-url "postgresql://user:password@localhost:5432/database"

# Import single department
python import-dpe.py dpe_data_complete.jsonl \
  --department 75 \
  --db-url "$DATABASE_URL"

# Dry run
python import-dpe.py dpe_data_complete.jsonl \
  --dry-run \
  --max-lines 10000 \
  --db-url "$DATABASE_URL"

# Advanced options
python import-dpe.py dpe_data_complete.jsonl \
  --department 13 \
  --max-workers 4 \
  --batch-size 500 \
  --retry-attempts 3 \
  --db-timeout 30 \
  --sequential \
  --debug \
  --db-url "$DATABASE_URL"
```

**Fields updated in `buildings`:**
- `dpe_id` : DPE identifier
- `class_dpe` : Energy class (A to G)
- `class_ges` : GHG emissions class
- `dpe_date_at` : Certificate date
- `dpe_type` : DPE type (method)
- `heating_building` : Heating type
- `dpe_import_match` : Matching method (rnb_id or ban_id)

---

## Prerequisites

### 1. ADEME API Key

To download data:

1. Create account at [data.ademe.fr](https://data.ademe.fr)
2. Generate API key at [data.ademe.fr/me/api-keys](https://data.ademe.fr/me/api-keys)
3. Set environment variable:
   ```bash
   export ADEME_API_KEY="your_api_key_here"
   ```

### 2. Python Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

**Main dependencies:**
- `psycopg2-binary` - PostgreSQL connection
- `tqdm` - Progress bars
- `requests` - API calls (import-ademe.py)

### 3. PostgreSQL Database

An accessible PostgreSQL database with connection URL:

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

---

## DPE Raw Import - Details

### `dpe_raw` Table Schema

The table stores **224 fields** organized in categories:

#### 🆔 Identifiers (~10 fields)
- `dpe_id`, `numero_dpe`, `id_rnb`, etc.

#### 📍 Location (~20 fields)
- BAN and raw addresses
- INSEE, postal, department, region codes
- Cartographic coordinates (Lambert 93)

#### ⚡ Energy Performance (~80 fields)
- DPE and GHG labels
- Consumption by usage (heating, DHW, lighting, cooling)
- Consumption by energy (n1, n2, n3)
- GHG emissions by usage and energy
- Detailed energy costs

#### 🏠 Building Characteristics (~30 fields)
- Type, construction year, surface area
- Number of levels, floors
- Construction period

#### 🔧 Technical Installations (~50 fields)
- Heating (types, generators, configurations)
- DHW - Domestic Hot Water (types, generators)
- Ventilation (type, quality)

#### 🛡️ Insulation and Losses (~20 fields)
- Insulation quality (walls, floors, windows, roof)
- Thermal losses (walls, thermal bridges)

#### 📅 Dates (~10 fields)
- Establishment, reception, validity, visit, modification

#### 🔬 Technical Metadata (~4 fields)
- DPE version, model, method

### Automatically Created Indexes

The schema creates 8 indexes to optimize performance:

1. `idx_dpe_raw_code_insee` - INSEE code (municipalities)
2. `idx_dpe_raw_code_postal` - Postal code
3. `idx_dpe_raw_code_departement` - Department code
4. `idx_dpe_raw_etiquette_dpe` - DPE label (A-G)
5. `idx_dpe_raw_date_etablissement` - Establishment date
6. `idx_dpe_raw_type_batiment` - Building type
7. `idx_dpe_raw_numero_dpe` - DPE number
8. `idx_dpe_raw_location` - Spatial coordinates (Lambert 93)

### Geographic Coordinates

⚠️ **Important note**: DPE data uses **Lambert 93** projection system (EPSG:2154), not latitude/longitude.

Available fields:
- `coordonnee_cartographique_x_ban` (Lambert 93)
- `coordonnee_cartographique_y_ban` (Lambert 93)
- `_geopoint` (string "lat,lon")

For more details, see [SPATIAL_INDEX_NOTE.md](SPATIAL_INDEX_NOTE.md)

---

## DPE Buildings Import

### Complete Workflow

```bash
# 1. Download data
export ADEME_API_KEY="your_api_key_here"
python import-ademe.py

# 2. Import into buildings table
python import-dpe.py dpe_data_complete.jsonl \
  --db-url "postgresql://user:password@localhost:5432/database"
```

### Automatic Resume

Scripts support automatic resume:

- Intermediate files cached in `dpe_processing_YYYYMMDD/` or `dpe_output_YYYYMMDD/`
- Rerun command to resume from where import stopped
- To force new processing, delete cache directory

### Generated Logs

- `dpe_processing_YYYYMMDD_HHMMSS.log` - Complete log
- `dpe_case2_debug_YYYYMMDD_HHMMSS.log` - Plot match debugging

### Statistics Report

At the end, a detailed report is displayed:

```
FINAL REPORT - OPTIMIZED VERSION WITH ERROR HANDLING
================================================================================
Mode: PRODUCTION
Total time: 0:45:23
Parallel workers: 4
SQL batch size: 500

DB CONNECTION STATISTICS:
  Connections created: 156
  Failed connections: 3
  Connection success rate: 98.1%

INPUT DATA:
  Lines processed: 1,234,567
  DPE with rnb_id: 856,234
  Duplicates removed: 45,123
  Departments processed: 96/96

PERFORMANCE:
  DPE processed/second: 287.5
  Parallelization gain: ~4x

UPDATES:
  Successful: 654,321
  Failed: 12
  Success rate: 99.9%

DISTRIBUTION BY CASE:
  Case 1.1 (RNB + Building DPE): 456,789
  Case 1.2 (RNB + Apartment DPE): 123,456
  Case 2.1 (Plot + Building DPE): 45,678
  Case 2.2 (Plot + Apartment DPE): 28,398
```

---

## Verification

### Verify Generated SQL Schema

```bash
# View beginning of file
head -50 create_dpe_raw_table_complete.sql

# Count fields
grep -c "^    [a-z_]" create_dpe_raw_table_complete.sql
# Should return: 224

# View created indexes
grep "CREATE INDEX" create_dpe_raw_table_complete.sql
```

### Verify Created Table

```bash
# Connect to database
psql "$DATABASE_URL"
```

```sql
-- Table structure
\d dpe_raw

-- Number of columns
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'dpe_raw';
-- Should return: 224

-- Created indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'dpe_raw';

-- Number of records
SELECT COUNT(*) FROM dpe_raw;

-- Sample data
SELECT
  dpe_id,
  code_insee_ban,
  etiquette_dpe,
  date_etablissement_dpe,
  type_batiment
FROM dpe_raw
LIMIT 5;

-- Distribution by DPE label
SELECT
  etiquette_dpe,
  COUNT(*) as count
FROM dpe_raw
GROUP BY etiquette_dpe
ORDER BY etiquette_dpe;

-- Distribution by department
SELECT
  code_departement_ban,
  COUNT(*) as count
FROM dpe_raw
GROUP BY code_departement_ban
ORDER BY code_departement_ban;
```

---

## Troubleshooting

### Error: "relation dpe_raw already exists"

Table already exists. Options:

```sql
-- Option 1: Drop and recreate (WARNING: data loss!)
DROP TABLE dpe_raw CASCADE;

-- Then rerun SQL script

-- Option 2: Rename old table
ALTER TABLE dpe_raw RENAME TO dpe_raw_old;
```

### Error: "column latitude does not exist"

This means old SQL schema is being used. Regenerate it:

```bash
python3 generate_schema.py dpe_data_complete.jsonl
```

New schema uses correct columns (`coordonnee_cartographique_x_ban` and `coordonnee_cartographique_y_ban`).

### JSONL file not found

```bash
# Check path
ls -lh dpe_data_complete.jsonl

# Navigate to correct directory
cd server/src/scripts/import-dpe
```

### Not enough fields detected

Increase sample size when generating schema:

```bash
python3 generate_schema.py dpe_data_complete.jsonl --sample-size 50000
```

### PostgreSQL connection errors

If you encounter SSL or connection errors:

```bash
# Increase timeout
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --db-timeout 60

# Increase retry attempts
python3 import-dpe.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --retry-attempts 5
```

### Performance issues

```bash
# Reduce number of workers
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --max-workers 2

# Reduce batch size
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --batch-size 1000

# Process one department at a time
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --sequential
```

### Memory issues

```bash
# Limit number of processed rows
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --limit 100000

# Process department by department
python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --department 01

python3 import_dpe_raw.py dpe_data_complete.jsonl \
  --db-url "$DATABASE_URL" \
  --department 02
# etc.
```

---

## Additional Documentation

- **[SPATIAL_INDEX_NOTE.md](SPATIAL_INDEX_NOTE.md)** - Explanations about geographic coordinates
- **Command-line help:**
  ```bash
  python3 generate_schema.py --help
  python3 import_dpe_raw.py --help
  python3 import-dpe.py --help
  ```

---

## ✅ Complete Checklist

### Preparation
- [ ] ADEME API key obtained and configured
- [ ] Python environment created and activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] PostgreSQL connection configured (`DATABASE_URL`)

### DPE Raw Import
- [ ] JSONL file downloaded (`dpe_data_complete.jsonl`)
- [ ] SQL schema generated (`generate_schema.py`)
- [ ] Files created: `create_dpe_raw_table_complete.sql` and `dpe_raw_fields.py`
- [ ] `dpe_raw` table created (224 columns)
- [ ] Test import successful (small sample with `--department` and `--limit`)
- [ ] Full import completed
- [ ] Verifications done (row count, indexes, etc.)

### DPE Buildings Import (optional)
- [ ] `buildings` table migrated and ready
- [ ] DPE import into `buildings` completed
- [ ] Statistics report verified

---

## 🎉 You're Ready!

For any questions or issues, consult additional documentation files or open an issue.

Happy importing! 🚀
