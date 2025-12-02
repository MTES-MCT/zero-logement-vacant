# User Kind Synchronization Script

Synchronize the `kind` column in the `users` table from Portail DF API data.

## Overview

This script fetches user information from the Portail DF API and updates the local `users` table with the appropriate `kind` value based on the `exterieur` and `gestionnaire` flags.

## Mapping Rules

| exterieur | gestionnaire | kind                       |
|-----------|--------------|----------------------------|
| `true`    | `false`      | `"prestataire"`            |
| `false`   | `true`       | `"gestionnaire"`           |
| `true`    | `true`       | `"prestataire, gestionnaire"` |
| `false`   | `false`      | `"aucun"`                  |

## Prerequisites

1. **Database Migration**: Run the migration to add the `kind` column:
   ```bash
   DATABASE_URL="<your-db-url>" yarn knex migrate:latest
   ```

2. **Python Dependencies**:
   ```bash
   pip install psycopg2-binary requests tqdm
   ```

## Usage

### Basic Usage

```bash
python sync_user_kind.py \
  --db-url "postgresql://user:pass@localhost:5432/dbname" \
  --api-url "https://portaildf.cerema.fr/api"
```

### Dry Run (Test Mode)

Test the script without making database changes:

```bash
python sync_user_kind.py \
  --db-url "postgresql://user:pass@localhost:5432/dbname" \
  --api-url "https://portaildf.cerema.fr/api" \
  --dry-run
```

### Limit Processing (Testing)

Process only first 100 users:

```bash
python sync_user_kind.py \
  --db-url "postgresql://user:pass@localhost:5432/dbname" \
  --api-url "https://portaildf.cerema.fr/api" \
  --limit 100
```

### Verbose Output

```bash
python sync_user_kind.py \
  --db-url "postgresql://user:pass@localhost:5432/dbname" \
  --api-url "https://portaildf.cerema.fr/api" \
  --verbose
```

### Debug Mode

```bash
python sync_user_kind.py \
  --db-url "postgresql://user:pass@localhost:5432/dbname" \
  --api-url "https://portaildf.cerema.fr/api" \
  --debug
```

## Command-Line Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--db-url` | Yes | - | PostgreSQL connection URI |
| `--api-url` | Yes | - | Portail DF API base URL |
| `--dry-run` | No | `false` | Simulation mode (no DB changes) |
| `--limit` | No | - | Limit number of users to process |
| `--batch-size` | No | `1000` | Batch size for DB updates |
| `--num-workers` | No | `4` | Number of parallel workers |
| `--verbose`, `-v` | No | `false` | Verbose output |
| `--debug` | No | `false` | Debug logging |

## How It Works

1. **Fetch Users**: Retrieves all users with email addresses from local database
2. **API Lookup**: For each user, queries Portail DF API: `/utilisateurs?email=<email>`
3. **Determine Kind**: Applies mapping rules based on `exterieur` and `gestionnaire` flags
4. **Batch Update**: Updates database in batches with parallel workers
5. **Summary**: Displays statistics about processed users

## Performance

- **API Requests**: Sequential (one per user) to avoid rate limiting
- **Database Updates**: Parallel batch processing (default: 4 workers, 1000 records/batch)
- **Expected Time**: ~1-2 seconds per user (API dependent)

### Optimizations

- Batch database updates (1000 records at a time)
- Parallel database workers (4 concurrent connections)
- Asynchronous commits (`synchronous_commit = off`)
- Progress tracking with `tqdm`

## Example Output

```
================================================================================
USER KIND SYNCHRONIZATION
================================================================================
API URL: https://portaildf.cerema.fr/api
Dry run: False

📋 Found 1,234 users to sync

🔄 Fetching data from Portail DF API...
Processing: 100%|████████████████| 1234/1234 [20:30<00:00, 1.01users/s]

💾 Updating 987 users...
Saving: 100%|████████████████████| 987/987 [00:02<00:00, 412.34users/s]
✅ Updated 987 users

================================================================================
SUMMARY
================================================================================
Total processed: 1,234
Updated: 987
Skipped (not in API): 247
Failed: 0

Kind distribution:
  Prestataire: 123
  Gestionnaire: 789
  Both: 45
  None: 30
================================================================================
```

## Error Handling

- **API Errors**: Users not found in API are skipped and logged
- **Network Issues**: Requests timeout after 10 seconds, errors are logged
- **Database Errors**: Failed batches are logged, processing continues
- **Resume Capability**: Script can be re-run safely (updates are idempotent)

## Logging

Logs are written to:
- **Console**: WARNING level (errors and important messages)
- **File**: INFO level (`sync_user_kind_YYYYMMDD_HHMMSS.log`)

Use `--verbose` or `--debug` flags for more detailed output.

## Troubleshooting

### API Returns No Data

```
User not found in Portail DF: user@example.com
```

**Solution**: User doesn't exist in Portail DF API, will be skipped.

### Connection Timeout

```
API request failed for user@example.com: Connection timeout
```

**Solution**:
- Check API URL is correct
- Verify network connectivity
- Try with `--limit 10` first to test

### Database Connection Failed

```
❌ Database connection failed: connection refused
```

**Solution**: Verify `--db-url` parameter is correct.

## Best Practices

1. **Test First**: Always run with `--dry-run` and `--limit 10` first
2. **Monitor Progress**: Use `--verbose` to see detailed progress
3. **Handle Failures**: Script logs errors but continues processing
4. **Re-run Safe**: Can be re-run multiple times (updates are idempotent)

## Related Files

- Migration: `server/src/infra/database/migrations/20241128175635-users-add-kind.ts`
- Best Practices: `docs/SCRIPT_BEST_PRACTICES.md`
