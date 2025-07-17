# Establishment Verifier Documentation

A Python script to verify structure permissions against establishments database by applying business rules for deletion and suspension.

## Overview

The **Establishment Verifier** compares SIREN data from a JSON Lines file with establishments in a PostgreSQL database and applies business rules to mark establishments as deleted or suspended based on access rights.

## Requirements

- Python 3.7+
- `psycopg2`, `dateutil`, and `click` packages

```bash
pip install psycopg2-binary python-dateutil click
```

## Business Rules

1. **Missing SIREN**: If an establishment's SIREN is missing from the JSONL file → mark as logically deleted (`deleted_at = NOW()`)

2. **Expired LOVAC Access**: If `acces_lovac` is NULL or older than today → suspend the establishment (`suspended_at = NOW()`, `suspended_cause = 'structure rights expired'`)

## Configuration

### Environment Variables (Recommended)

```bash
# Database connection
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="your_database"
export DB_USER="your_username"
export DB_PASSWORD="your_password"
```

### Command Line Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--jsonl-file` | `-f` | `structures.jsonl` | Path to JSON Lines structures file |
| `--db-host` | `-h` | `localhost` | Database host |
| `--db-port` | `-p` | `5432` | Database port |
| `--db-name` | `-d` | *Required* | Database name |
| `--db-user` | `-u` | *Required* | Database user |
| `--db-password` | `-w` | *Required* | Database password |
| `--dry-run` | | `False` | Show changes without applying them |
| `--verbose` | `-v` | `False` | Enable verbose logging |

## Usage

### Basic Usage

```bash
# Set up database credentials
export DB_NAME="mydb"
export DB_USER="myuser"
export DB_PASSWORD="mypassword"

# Run the verification
python establishment-verifier.py
```

### Common Examples

```bash
# Basic usage with environment variables
python establishment-verifier.py

# Custom database connection
python establishment-verifier.py --db-host db.example.com --db-port 5433

# Dry run to preview changes
python establishment-verifier.py --dry-run

# Verbose output for debugging
python establishment-verifier.py --verbose

# Custom JSONL file
python establishment-verifier.py --jsonl-file my_structures.jsonl
```

## Database Schema Requirements

The script expects a `public.establishments` table with these columns:

```sql
CREATE TABLE public.establishments (
    id UUID PRIMARY KEY,
    siren INTEGER,
    deleted_at TIMESTAMP,
    suspended_at TIMESTAMP,
    suspended_cause TEXT
);
```

## Input Format

The script reads a JSON Lines file where each line contains structure data:

```json
{"id_structure": 1, "siret": "22330001300016", "acces_lovac": "2027-12-04T00:00:00+01:00"}
{"id_structure": 2, "siret": "21750001600019", "acces_lovac": null}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `siret` | 14-digit SIRET (first 9 digits used as SIREN) |
| `acces_lovac` | LOVAC access date (ISO-8601) or null |

## Processing Logic

1. **Load structures** from JSONL file, extracting SIREN from SIRET
2. **Fetch establishments** from database
3. **Apply business rules** for each establishment:
   - Missing SIREN → mark for deletion
   - Expired/null LOVAC → mark for suspension
4. **Execute actions** (or show in dry-run mode)

## Output Examples

### Dry Run Mode
```
DRY RUN — 15 updates to perform:
  DELETE  → 12345678-1234-5678-9abc-123456789012
  SUSPEND → 87654321-4321-8765-cba9-987654321098 (structure rights expired)
```

### Normal Execution
```
=== STRUCTURE RIGHTS CHECK ===
Structures loaded: 1,247
Establishments fetched: 856
Updates applied: 15
```

## Features

- **Schema validation** - Checks required database columns exist
- **Dry run mode** - Preview changes without applying them
- **Comprehensive logging** - Saved to `structure_verifier.log`
- **Error handling** - Graceful handling of database and file errors
- **Environment variables** - Secure credential management
- **Progress tracking** - Clear feedback on processing status

## Dry Run Mode

Always test changes first using dry run mode:

```bash
python establishment-verifier.py --dry-run --verbose
```

This shows exactly what would be changed without modifying the database.

## Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Check connection parameters
python establishment-verifier.py --verbose

# Test connection manually
psql -h localhost -p 5432 -d mydb -U myuser
```

**Missing Schema:**
```
Missing columns on establishments: deleted_at, suspended_at
```
**Solution:** Add required columns to the establishments table.

**File Not Found:**
```
JSONL file not found: structures.jsonl
```
**Solution:** Ensure the JSONL file exists or specify correct path with `--jsonl-file`.

### Debug Mode

```bash
# Enable verbose logging
python establishment-verifier.py --verbose

# Check logs
tail -f structure_verifier.log

# Validate database schema
python establishment-verifier.py --dry-run --verbose
```

### Database Queries

```sql
-- Check establishment status
SELECT 
    COUNT(*) as total,
    COUNT(deleted_at) as deleted,
    COUNT(suspended_at) as suspended
FROM public.establishments;

-- View recent changes
SELECT id, siren, deleted_at, suspended_at, suspended_cause
FROM public.establishments
WHERE deleted_at > NOW() - INTERVAL '1 day'
   OR suspended_at > NOW() - INTERVAL '1 day';
```

## Security Considerations

- **Never hardcode credentials** - Use environment variables
- **Use read-only database users** when possible for dry runs
- **Review dry run output** before applying changes
- **Monitor logs** for unexpected behavior
- **Backup database** before running updates

## Integration Examples

### Automated Pipeline

```bash
#!/bin/bash
# Daily structure verification
export DB_NAME="production_db"
export DB_USER="verifier_user"
export DB_PASSWORD="secure_password"

# Run dry run first
python establishment-verifier.py --dry-run > /tmp/preview.log

# If preview looks good, apply changes
if [ $? -eq 0 ]; then
    python establishment-verifier.py
fi
```

### Monitoring

```bash
# Check for errors in logs
grep ERROR structure_verifier.log | tail -10

# Count recent updates
grep "Updates applied" structure_verifier.log | tail -1
```