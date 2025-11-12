# Import DPE

This set of scripts imports DPE (Diagnostic de Performance Énergétique - Energy Performance Certificate) data from the ADEME API into the database.

The import process consists of two steps:

1. **Download** DPE data from the ADEME API using `import-ademe.py`
2. **Import** data into PostgreSQL database using `import-dpe.py`

## Scripts

### 1. `import-ademe.py`

Downloads all DPE data from the ADEME API with authentication and resumption support.

**Features:**
- Automatic resume after interruption
- Authentication with API key (via environment variable or argument)
- JSON Lines streaming output
- Connection retry logic

**Usage:**
```shell
# Using environment variable (recommended)
export ADEME_API_KEY="your_api_key_here"
python import-ademe.py

# Or using command-line argument
python import-ademe.py --api-key YOUR_API_KEY

# With custom options
python import-ademe.py \
  --api-key YOUR_API_KEY \
  --output-file custom_output.jsonl \
  --limit-per-page 5000 \
  --max-pages 100
```

**Programmatic Usage:**
```python
from import_ademe import AdemeApiClient

client = AdemeApiClient(api_key="YOUR_API_KEY")
total_records = client.fetch_all_data(output_file="dpe_data.jsonl")
```

### 2. `import-dpe.py`

Processes and imports DPE data into PostgreSQL `buildings` table.

**Features:**
- Department-based parallel processing
- Automatic deduplication by RNB ID
- Multi-stage matching strategy (RNB ID → BAN ID → Plot ID)
- Connection pooling with robust error handling
- Comprehensive logging and statistics
- Dry-run mode for testing

**Matching Strategy:**
1. **Case 1**: Direct match via RNB ID
   - 1.1: Building-level DPE (collective building or individual house)
   - 1.2: Apartment-level DPE
2. **Case 2**: Match via BAN address → Plot → Building
   - 2.1: Building-level DPE
   - 2.2: Apartment-level DPE

### 3. `import_dpe_raw.py`

Imports raw DPE data into PostgreSQL `dpe_raw` table for archival and analysis purposes.

**Features:**
- Department-based parallel or sequential processing
- Structured storage with proper data types
- Automatic duplicate detection via unique constraint
- Resume capability (skips already imported records)
- Configurable batch processing and workers
- Dry-run mode for testing

**Usage:**
```shell
# Create the table first
psql -d database -f create_dpe_raw_table.sql

# Import all departments in parallel (default)
python import_dpe_raw.py dpe_data_complete.jsonl --db-url "postgresql://user:pass@localhost:5432/db"

# Import all departments sequentially (one at a time)
python import_dpe_raw.py dpe_data_complete.jsonl --sequential --db-url "$DATABASE_URL"

# Import only department 75 (Paris)
python import_dpe_raw.py dpe_data_complete.jsonl --department 75 --db-url "$DATABASE_URL"

# Resume from department 50
python import_dpe_raw.py dpe_data_complete.jsonl --sequential --start-department 50 --db-url "$DATABASE_URL"

# Test with dry-run
python import_dpe_raw.py dpe_data_complete.jsonl --department 69 --limit 1000 --dry-run --db-url "$DATABASE_URL"
```

**Table Schema:**
The `dpe_raw` table stores DPE fields including:
- Identifiers (dpe_id, numero_dpe)
- Location (addresses, coordinates, codes)
- Building characteristics (type, year, surface)
- Energy performance (etiquette_dpe, etiquette_ges, consumption, emissions)
- Dates (establishment, reception, validity, visit)

## Prerequisites

### ADEME API Key

To use `import-ademe.py`, you need an ADEME API key:

1. Create an account on [data.ademe.fr](https://data.ademe.fr)
2. Generate an API key at [https://data.ademe.fr/me/api-keys](https://data.ademe.fr/me/api-keys)
3. Set it as an environment variable:
   ```shell
   export ADEME_API_KEY="your_api_key_here"
   ```

### Python Environment

A Python virtual environment with required dependencies:

```shell
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

### Database

A PostgreSQL database must be migrated and accessible with credentials provided via `--db-url` argument.

For raw data import, create the `dpe_raw` table first:

```shell
# Using psql
psql -d your_database -f create_dpe_raw_table.sql

# Or using PostgreSQL connection URI
psql postgresql://user:pass@localhost:5432/database -f create_dpe_raw_table.sql
```

## Usage

### Step 1: Download DPE Data

```shell
# Set your API key
export ADEME_API_KEY="your_api_key_here"

# Download data
python import-ademe.py
```

This will create `dpe_data_complete.jsonl` with automatic resume support if interrupted.

### Step 2: Import DPE Data into Database

#### Complete Processing (All Departments)

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --db-url "postgresql://user:password@localhost:5432/database"
```

#### Single Department Processing

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --department 75 \
  --db-url "postgresql://user:password@localhost:5432/database"
```

#### Dry Run (Test Mode)

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --dry-run \
  --max-lines 10000 \
  --db-url "postgresql://user:password@localhost:5432/database"
```

#### Advanced Options

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --department 13 \
  --max-workers 4 \
  --batch-size 500 \
  --retry-attempts 3 \
  --db-timeout 30 \
  --sequential \
  --debug \
  --db-url "postgresql://user:password@localhost:5432/database?sslmode=prefer"
```

#### Resume from Specific Department

```shell
# Process all departments starting from department 13 (inclusive)
python import-dpe.py dpe_data_complete.jsonl \
  --start-department 13 \
  --db-url "postgresql://user:password@localhost:5432/database"
```

**Available Options:**
- `--db-url`: PostgreSQL connection URI (required) - Format: `postgresql://user:password@host:port/database?sslmode=prefer`
- `--department`, `--dept`: Process a specific department only (e.g., 75, 01, 2A)
- `--start-department`, `--start-dept`: Start processing from this department code when processing multiple departments (e.g., 75, 01, 2A)
- `--max-lines`: Limit the number of input lines to process
- `--dry-run`: Simulation mode (no database modifications)
- `--debug`: Enable detailed debug logging
- `--sequential`: Process departments one by one instead of in parallel
- `--max-workers`: Number of parallel workers (default: 6)
- `--batch-size`: SQL batch size (default: 500)
- `--retry-attempts`: Connection retry attempts (default: 3)
- `--db-timeout`: Database timeout in seconds (default: 30)
- `--output-dir`: Custom output directory for intermediate files

## Output

### Log Files

The script generates detailed log files:
- `dpe_processing_YYYYMMDD_HHMMSS.log` - Complete processing log
- `dpe_case2_debug_YYYYMMDD_HHMMSS.log` - Debug log for plot_id matching

### Statistics

At the end of processing, a comprehensive report is displayed:

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
  Connection retries: 2
  Successful retries: 2
  Total connection errors: 3
  Connection success rate: 98.1%

INPUT DATA:
  Lines processed: 1,234,567
  DPE with rnb_id: 856,234
  rnb_id rate: 69.4%
  Filtered lines (rnb_id provided): 856,234
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

IGNORED ITEMS:
  No join key: 123,456
  Inadequate DPE method: 45,678
  Unknown RNB IDs: 78,901
  Unknown BAN IDs: 34,567
```

## Data Processing Pipeline

1. **Preprocessing**: Split input file by department and deduplicate by RNB ID
2. **Parallel Processing**: Each department is processed independently
3. **Batch Matching**: Buildings are matched in batches via RNB ID or BAN address
4. **Update**: Building records are updated with DPE information
5. **Reporting**: Statistics and logs are generated

## Resumption Support

The import script supports automatic resumption:
- Intermediate files by department are cached in `dpe_processing_YYYYMMDD/` or `dpe_output_YYYYMMDD/`
- If processing is interrupted, re-running with the same parameters will reuse cached files
- To force a full reprocessing, delete the output directory

## Troubleshooting

### Connection Errors

If you encounter SSL or connection errors:
- Use `--disable-ssl` flag
- Increase `--db-timeout` (e.g., `--db-timeout 60`)
- Increase `--retry-attempts` (e.g., `--retry-attempts 5`)

### Performance Issues

- Reduce `--max-workers` if system is overloaded
- Reduce `--batch-size` if you get timeout errors
- Process departments individually using `--department`

### Memory Issues

- Use `--max-lines` to limit processing
- Process departments one at a time
- Increase system swap space

## Database Schema

The script updates the following fields in the `buildings` table:

- `dpe_id`: DPE identifier number
- `class_dpe`: Energy performance class (A to G)
- `class_ges`: Greenhouse gas emissions class
- `dpe_date_at`: DPE certificate date
- `dpe_type`: Type of DPE (method used)
- `heating_building`: Primary heating energy type
- `dpe_import_match`: Matching method used (rnb_id or plot_id)

## Notes

- The script prioritizes building-level DPE over apartment-level DPE
- More recent DPE certificates overwrite older ones
- The matching is done first by RNB ID, then by BAN address if RNB ID is not available
- Connection pooling and retry logic ensure reliability for long-running imports
