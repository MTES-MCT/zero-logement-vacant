# Users Verifier Documentation

A Python script to automatically deactivate users according to business rules by comparing JSON Lines data with database records.

## Overview

The **Users Verifier** compares user data from a JSON Lines file with users in a PostgreSQL database and applies business rules to mark users as deleted or suspended based on presence, expiration dates, and structure access rights using local structure data.

## Requirements

- Python 3.7+
- `psycopg2`, `dateutil`, and `click` packages

```bash
pip install psycopg2-binary python-dateutil click
```

## Business Rules

1. **Missing User**: If a user is absent from the JSON Lines file → mark as logically deleted (`deleted_at = NOW()`)

2. **Expired User Rights**: If user expiration date is in the past → suspend the user (`suspended_at = NOW()`, `suspended_cause = 'droits utilisateur expires'`)

3. **Invalid Terms of Service**: If `cgu_valide` is NULL → suspend the user (`suspended_at = NOW()`, `suspended_cause = 'cgu vides'`)

4. **Expired Structure Rights**: If user's structure has expired LOVAC access → suspend the user (`suspended_at = NOW()`, `suspended_cause = 'droits structure expires'`)

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
| `--users-file` | `-u` | `users.jsonl` | Path to JSON Lines users file |
| `--structures-file` | `-s` | `structures.jsonl` | Path to JSON Lines structures file |
| `--db-host` | `-h` | `localhost` | Database host |
| `--db-port` | `-p` | `5432` | Database port |
| `--db-name` | `-d` | *Required* | Database name |
| `--db-user` | `-U` | *Required* | Database user |
| `--db-password` | `-w` | *Required* | Database password |
| `--dry-run` | | `False` | Show changes without applying them |
| `--verbose` | `-v` | `False` | Enable verbose logging |

## Usage

### Basic Usage

```bash
# Set up credentials
export DB_NAME="mydb"
export DB_USER="myuser"
export DB_PASSWORD="mypassword"

# Run the verification
python users-verifier.py
```

### Common Examples

```bash
# Basic usage with environment variables
python users-verifier.py

# Custom database connection
python users-verifier.py --db-host db.example.com --db-port 5433

# Dry run to preview changes
python users-verifier.py --dry-run

# Verbose output for debugging
python users-verifier.py --verbose

# Custom files
python users-verifier.py --users-file my_users.jsonl --structures-file my_structures.jsonl
```

## Database Schema Requirements

The script expects a `public.users` table with these columns:

```sql
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    establishment_id INTEGER,
    deleted_at TIMESTAMP,
    suspended_at TIMESTAMP,
    suspended_cause TEXT
);
```

## Input Format

### Users File (`users.jsonl`)

Each line contains user data:

```json
{"id_user": 1, "email": "user@example.com", "date_rattachement": "2024-01-15T10:30:00+01:00", "structure": 123, "date_expiration": "2025-12-31T23:59:59+01:00", "exterieur": false, "gestionnaire": true, "groupe": 1, "cgu_valide": "2024-01-15T10:30:00+01:00", "str_mandataire": null}
```

#### Required User Fields

| Field | Description |
|-------|-------------|
| `id_user` | Unique user identifier |
| `email` | User email address |
| `date_expiration` | User rights expiration date (ISO-8601) |
| `structure` | Associated structure ID |
| `cgu_valide` | Terms of service validation date |

### Structures File (`structures.jsonl`)

Each line contains structure data:

```json
{"id_structure": 123, "siret": "12345678901234", "acces_lovac": "2025-12-31T23:59:59+01:00"}
```

#### Required Structure Fields

| Field | Description |
|-------|-------------|
| `id_structure` | Unique structure identifier |
| `siret` | 14-digit SIRET number |
| `acces_lovac` | LOVAC access expiration date (ISO-8601) or null |

## Processing Logic

1. **Load users** from JSON Lines file, indexed by email
2. **Load structures** from JSON Lines file, indexed by structure ID
3. **Fetch users** from database
4. **Apply business rules** for each database user:
   - Missing from API → mark for deletion
   - Rights expired → mark for suspension
   - Invalid ToS → mark for suspension
   - Structure rights expired → mark for suspension (using local structure data)
5. **Execute actions** (or show in dry-run mode)

## Output Examples

### Dry Run Mode
```
DRY RUN MODE - 23 actions would be performed:
  DELETE: john.doe@example.com - user absent from API
  SUSPEND: jane.smith@example.com - droits utilisateur expires, droits structure expires
```

### Normal Execution
```
=== AUTOMATIC DEACTIVATION SCRIPT ===
Users loaded from API: 1,247
Structures loaded: 856
Users retrieved from database: 1,156
Users deleted: 5
Users suspended: 18
Total actions: 23
```

## Features

- **Schema validation** - Checks required database columns exist
- **Dry run mode** - Preview changes without applying them
- **Local structure validation** - Uses local structure data for faster processing
- **Comprehensive logging** - Saved to `user_deactivation.log`
- **Error handling** - Graceful handling of database and file errors
- **Environment variables** - Secure credential management
- **Progress tracking** - Clear feedback on processing status
- **Offline operation** - No API calls required

## Dry Run Mode

Always test changes first using dry run mode:

```bash
python users-verifier.py --dry-run --verbose
```

This shows exactly what would be changed without modifying the database.

## Built-in Reporting

The script provides detailed statistics at completion:

```
=== DEACTIVATION REPORT ===
Users deleted: 5
Users suspended: 18
Total actions: 23

=== SUSPENSION REASONS ===
  droits utilisateur expires: 12 users
  droits structure expires: 8 users
  cgu vides: 3 users
```

## Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Check connection parameters
python users-verifier.py --verbose

# Test connection manually
psql -h localhost -p 5432 -d mydb -U myuser
```

**Missing Schema:**
```
Missing columns: suspended_at, suspended_cause
```
**Solution:** Add required columns to the users table or run database migrations.

**File Not Found:**
```
JSON Lines file not found: users.jsonl
```
**Solution:** Ensure the JSONL files exist or specify correct paths with `--users-file` and `--structures-file`.

**Structure Not Found:**
```
Structure 123 not found in structures file
```
**Solution:** Ensure the structures file contains all referenced structures or regenerate it.

### Debug Mode

```bash
# Enable verbose logging
python users-verifier.py --verbose

# Check logs
tail -f user_deactivation.log

# Validate database schema
python users-verifier.py --dry-run --verbose
```

### Database Queries

```sql
-- Check user status
SELECT 
    COUNT(*) as total,
    COUNT(deleted_at) as deleted,
    COUNT(suspended_at) as suspended
FROM public.users;

-- View recent changes
SELECT id, email, deleted_at, suspended_at, suspended_cause
FROM public.users
WHERE deleted_at > NOW() - INTERVAL '1 day'
   OR suspended_at > NOW() - INTERVAL '1 day';

-- Suspension reasons analysis
SELECT 
    suspended_cause,
    COUNT(*) as count
FROM public.users
WHERE suspended_at IS NOT NULL
GROUP BY suspended_cause
ORDER BY count DESC;
```

### File Validation

```bash
# Check users file format
head -5 users.jsonl | python -m json.tool

# Count users
wc -l users.jsonl

# Check structures file format
head -5 structures.jsonl | python -m json.tool

# Count structures
wc -l structures.jsonl
```

## Security Considerations

- **Never hardcode credentials** - Use environment variables
- **Use read-only database users** when possible for dry runs
- **Review dry run output** before applying changes
- **Monitor logs** for unexpected behavior
- **Backup database** before running updates
- **Secure file access** - Ensure proper file permissions

## Integration Examples

### Automated Pipeline

```bash
#!/bin/bash
# Daily user verification
export DB_NAME="production_db"
export DB_USER="verifier_user"
export DB_PASSWORD="secure_password"

# Ensure files exist
if [[ ! -f "users.jsonl" || ! -f "structures.jsonl" ]]; then
    echo "Required files not found"
    exit 1
fi

# Run dry run first
python users-verifier.py --dry-run > /tmp/preview.log

# If preview looks good, apply changes
if [ $? -eq 0 ]; then
    python users-verifier.py
fi
```

### Monitoring

```bash
# Check for errors in logs
grep ERROR user_deactivation.log | tail -10

# Count recent updates
grep "Total actions" user_deactivation.log | tail -1

# Monitor structure checks
grep "Checking structure" user_deactivation.log | wc -l
```

### Cron Job Example

```bash
# Add to crontab for daily execution at 2 AM
0 2 * * * cd /path/to/script && /path/to/venv/bin/python /path/to/users-verifier.py >> /var/log/user-verification.log 2>&1
```

## Performance Considerations

- **File I/O**: Both input files are loaded into memory for fast processing
- **Database connections**: Single connection per execution
- **Memory usage**: Scales with number of users and structures
- **Processing speed**: No network delays, faster than API-based approach

## Error Recovery

The script includes robust error handling:

- **Database errors**: Transactions are rolled back on failure
- **File errors**: Graceful handling of missing or corrupted files
- **Data validation**: Skips invalid records with logging
- **Memory management**: Efficient data structure usage

## File Management

### Generating Input Files

Use the companion scraper script to generate the required files:

```bash
# Generate both files
python cerema-scraper.py

# Generate only users
python cerema-scraper.py --users-only

# Generate only structures
python cerema-scraper.py --structures-only
```

### File Maintenance

```bash
# Check file freshness
ls -la users.jsonl structures.jsonl

# Validate file integrity
python -c "
import json
with open('users.jsonl') as f:
    for i, line in enumerate(f):
        try:
            json.loads(line)
        except:
            print(f'Invalid JSON at line {i+1}')
"
```

## Migration from API Version

If migrating from the API-based version:

1. **Remove API configuration** - No longer needed
2. **Update file paths** - Use `--users-file` and `--structures-file`
3. **Generate structure file** - Run the scraper to create `structures.jsonl`
4. **Test thoroughly** - Use `--dry-run` to verify behavior

The offline version provides the same functionality with improved performance and reliability.