# Import DPE

This set of scripts imports DPE (Diagnostic de Performance Énergétique - Energy Performance Certificate) data from the ADEME API into the database.

The import process consists of the following steps:

- Download DPE data from the ADEME API
- Process and deduplicate the data by department
- Match DPE records with existing buildings using RNB IDs or BAN addresses
- Update building records with DPE information (energy class, GES class, heating type, etc.)

## Scripts

### 1. `download-dpe.py`

Downloads all DPE data from the ADEME public API and saves it to CSV and JSONL files.

**Features:**
- Pagination handling with automatic retry
- Progress tracking with real-time statistics
- Dual output format (CSV and JSONL)
- Optional filtering capabilities

**Usage:**
```shell
python download-dpe.py
```

### 2. `import-ademe.py`

Advanced client for the ADEME DPE API with resumption support.

**Features:**
- Automatic resume after interruption
- Authentication with API key
- JSON Lines streaming output
- Connection retry logic

**Usage:**
```python
from import_ademe import AdemeApiClient

client = AdemeApiClient(api_key="YOUR_API_KEY")
total_records = client.fetch_all_data(output_file="dpe_data.jsonl")
```

### 3. `import-dpe.py`

Main processing script that imports DPE data into PostgreSQL database.

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

## Prerequisites

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

A PostgreSQL database must be migrated and accessible with the following credentials as command-line arguments.

## Usage

### Download DPE Data

```shell
python download-dpe.py
```

This will create:
- `dpe_ademe_complet.csv` - Full dataset in CSV format
- `dpe_ademe_complet.jsonl` - Full dataset in JSONL format

### Import DPE Data into Database

#### Complete Processing (All Departments)

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --db-name your_database \
  --db-user your_user \
  --db-password your_password \
  --db-host localhost \
  --db-port 5432
```

#### Single Department Processing

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --department 75 \
  --db-name your_database \
  --db-user your_user \
  --db-password your_password
```

#### Dry Run (Test Mode)

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --dry-run \
  --max-lines 10000 \
  --db-name your_database \
  --db-user your_user \
  --db-password your_password
```

#### Advanced Options

```shell
python import-dpe.py dpe_data_complete.jsonl \
  --department 13 \
  --max-workers 4 \
  --batch-size 500 \
  --retry-attempts 3 \
  --db-timeout 30 \
  --disable-ssl \
  --debug \
  --db-name your_database \
  --db-user your_user \
  --db-password your_password
```

**Available Options:**
- `--department`, `--dept`: Process a specific department only (e.g., 75, 01, 2A)
- `--max-lines`: Limit the number of input lines to process
- `--dry-run`: Simulation mode (no database modifications)
- `--debug`: Enable detailed debug logging
- `--max-workers`: Number of parallel workers (default: CPU count, max 4)
- `--batch-size`: SQL batch size (default: 500)
- `--retry-attempts`: Connection retry attempts (default: 3)
- `--db-timeout`: Database timeout in seconds (default: 30)
- `--disable-ssl`: Disable SSL for database connection
- `--ssl-mode`: SSL mode (disable, prefer, require, etc.)
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
